import type { ExtensionRequest, ExtensionResponse } from '../types';
import { extractAmazonProductDetails } from './helpers/extractAmazonProductDetails';
import contentCss from './content.css?inline';

const ACTION_SAVE_PRODUCT = 'SAVE_AMAZON_PRODUCT';
const ACTION_SCRAPE_PRODUCT = 'SCRAPE_AMAZON_PRODUCT';

function injectFloatingSaveButton() {
  if (!document.body) {
    return;
  }

  const existingRoot = document.getElementById('amazon-product-saver-root');
  if (existingRoot && document.contains(existingRoot)) {
    if (existingRoot.parentElement === document.body) {
      return;
    }
    existingRoot.remove();
  }

  const rootHost = document.createElement('div');
  rootHost.id = 'amazon-product-saver-root';
  rootHost.className = 'saver-root-host';

  const shadow = rootHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = contentCss;

  const btn = document.createElement('button');
  btn.className = 'saver-pill-button';
  btn.type = 'button';
  btn.innerHTML = `
    <span class="save-btn-icon">🛍️</span>
    <span id="btn-label" class="save-btn-label">Save Product Details</span>
  `;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const label = btn.querySelector('#btn-label') as HTMLSpanElement;
    const product = extractAmazonProductDetails();
    if (!product) {
      showShadowToast(shadow, '❌ Could not extract product details on this page.', true);
      return;
    }

    btn.style.pointerEvents = 'none';
    if (label) label.innerText = '⏳ Saving product...';

    chrome.runtime.sendMessage(
      { action: ACTION_SAVE_PRODUCT, product },
      (res: ExtensionResponse) => {
        btn.style.pointerEvents = 'auto';
        if (label) label.innerText = 'Save Product Details';

        if (res && res.success) {
          showShadowToast(shadow, `✓ Saved "${product.title.slice(0, 30)}..." to Product Lister!`);
        } else {
          showShadowToast(shadow, `❌ Error: ${res?.error || 'Failed to save product'}`, true);
        }
      }
    );
  });

  shadow.appendChild(style);
  shadow.appendChild(btn);

  document.body.appendChild(rootHost);
  console.log('[Product Lister] Floating Shadow DOM save button successfully injected into document.body!');
}

function showShadowToast(shadow: ShadowRoot, message: string, isError = false) {
  const existing = shadow.querySelector('.saver-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `saver-toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  shadow.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

chrome.runtime.onMessage.addListener((req: ExtensionRequest, _sender, sendResponse) => {
  if (req.action === ACTION_SCRAPE_PRODUCT) {
    const product = extractAmazonProductDetails();
    if (product) {
      sendResponse({ success: true, product });
    } else {
      sendResponse({ success: false, error: 'Not a valid Amazon product page or details could not be extracted.' });
    }
    return true;
  }
});

function isAmazonDomain(): boolean {
  return (
    /(^|\.)amazon\.(com|in|co\.uk|de|ca|fr|es|it|co\.jp|com\.au|com\.mx|sg|ae|nl|se|pl|com\.br|com\.tr|sa|eg)$/i.test(
      window.location.hostname
    ) || window.location.hostname.includes('amazon.')
  );
}

function isAmazonProductPage(): boolean {
  if (!isAmazonDomain()) return false;

  const href = window.location.href;
  const pathname = window.location.pathname;
  const search = window.location.search;

  if (
    /\/(?:dp|gp\/product|product|gp\/aw\/d|d)\/([A-Z0-9]{10})/i.test(href) ||
    /[?&]asin=([A-Z0-9]{10})/i.test(search) ||
    pathname.includes('/dp/') ||
    pathname.includes('/gp/product/') ||
    pathname.includes('/gp/aw/d/')
  ) {
    return true;
  }

  const productIndicators = document.querySelector(
    '#productTitle, span#productTitle, #title, #titleSection, #item_name, #ebooksProductTitle, input#ASIN, input[name="ASIN"], #dp, #dp-container, #ppd, #centerCol, #corePrice_feature_div, #add-to-cart-button, #buy-now-button'
  );

  return Boolean(productIndicators);
}

function syncFloatingButton() {
  if (!isAmazonDomain()) return;

  const isProduct = isAmazonProductPage();
  const existingRoot = document.getElementById('amazon-product-saver-root');

  if (isProduct) {
    if (!existingRoot || !document.contains(existingRoot) || existingRoot.parentElement !== document.body) {
      injectFloatingSaveButton();
    }
  } else {
    // If navigated away from a product page, remove the button
    if (existingRoot) {
      existingRoot.remove();
    }
  }
}

function setupAutoInject() {
  if (!isAmazonDomain()) return;

  console.log('[Product Lister] Amazon content script initialized on:', window.location.href);

  // Initial attempt
  syncFloatingButton();

  // Document lifecycle events
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncFloatingButton);
  }
  window.addEventListener('load', syncFloatingButton);

  // Hook History API for Amazon SPA / PJAX navigation
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(syncFloatingButton, 100);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(syncFloatingButton, 100);
  };

  window.addEventListener('popstate', () => {
    setTimeout(syncFloatingButton, 100);
  });

  // MutationObserver for streaming DOM hydration and client-side page transitions
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      syncFloatingButton();
    }, 250);
  });

  const observeTarget = document.body || document.documentElement;
  if (observeTarget) {
    observer.observe(observeTarget, { childList: true, subtree: true });
  }

  // Periodic safety net to handle dynamic Amazon element swaps
  setInterval(syncFloatingButton, 1000);
}

setupAutoInject();
