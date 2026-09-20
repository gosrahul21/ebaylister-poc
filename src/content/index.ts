import { ExtensionAction, ExtensionRequest, ExtensionResponse } from '../types';
import { extractAmazonProductDetails } from './helpers/extractAmazonProductDetails';


// ── Floating Page Action Overlay ─────────────────────────────────────────────
function injectFloatingSaveButton() {
  if (document.getElementById('amazon-product-saver-float')) return;

  const btn = document.createElement('button');
  btn.id = 'amazon-product-saver-float';
  btn.innerHTML = `
    <span style="font-size: 16px;">🛍️</span>
    <span>Save Product Details</span>
  `;

  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 18px;
    background: linear-gradient(135deg, #131921 0%, #232f3e 100%);
    color: #ff9900;
    border: 1px solid #ff9900;
    border-radius: 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,0.45);
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px) scale(1.03)';
    btn.style.boxShadow = '0 12px 30px rgba(255, 153, 0, 0.35)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'none';
    btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.45)';
  });

  btn.addEventListener('click', () => {
    const product = extractAmazonProductDetails();
    if (!product) {
      showToast('❌ Could not extract product details on this page.', true);
      return;
    }

    btn.disabled = true;
    btn.innerText = '⏳ Saving product...';

    chrome.runtime.sendMessage(
      { action: ExtensionAction.SAVE_AMAZON_PRODUCT, product },
      (res: ExtensionResponse) => {
        btn.disabled = false;
        btn.innerHTML = `<span>🛍️</span><span>Save Product Details</span>`;

        if (res && res.success) {
          showToast(`✓ Saved "${product.title.slice(0, 32)}..." to Product Lister!`);
        } else {
          showToast(`❌ Error: ${res?.error || 'Failed to save product'}`, true);
        }
      }
    );
  });

  const container = document.body || document.documentElement;
  if (container) {
    container.appendChild(btn);
    console.log('[Product Lister] Floating "Save Product Details" button successfully injected into page!');
  }
}

function showToast(message: string, isError = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 24px;
    z-index: 2147483647;
    padding: 12px 20px;
    background: ${isError ? '#ef4444' : '#10b981'};
    color: #ffffff;
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    animation: toastIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ── Message Listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((req: ExtensionRequest, _sender, sendResponse) => {
  if (req.action === ExtensionAction.SCRAPE_AMAZON_PRODUCT) {
    const product = extractAmazonProductDetails();
    if (product) {
      sendResponse({ success: true, product });
    } else {
      sendResponse({ success: false, error: 'Not a valid Amazon product page or details could not be extracted.' });
    }
    return true;
  }
});

// Auto-inject floating save button on Amazon product details pages with polling & retry
function isAmazonProductPage(): boolean {
  if (!window.location.hostname.includes('amazon.')) return false;
  
  // Check URL patterns (/dp/ASIN, /gp/product/ASIN, etc.)
  if (/\/(?:dp|gp\/product|product-reviews)\/([A-Z0-9]{10})/i.test(window.location.href)) return true;
  if (window.location.href.includes('/dp/')) return true;
  
  // Check DOM indicators
  const productIndicators = document.querySelector(
    '#productTitle, #title, input#ASIN, input[name="ASIN"], [data-asin], #dp-container, #ppd, #centerCol'
  );
  return !!productIndicators;
}

function initAutoInject() {
  if (document.getElementById('amazon-product-saver-float')) return;

  if (isAmazonProductPage()) {
    injectFloatingSaveButton();
    return;
  }

  // Polling fallback up to 20 retries (10 seconds) for dynamically rendered Amazon pages
  let retries = 0;
  const timer = setInterval(() => {
    retries++;
    if (document.getElementById('amazon-product-saver-float')) {
      clearInterval(timer);
      return;
    }

    if (isAmazonProductPage()) {
      injectFloatingSaveButton();
      clearInterval(timer);
      return;
    }

    if (retries >= 20) {
      clearInterval(timer);
    }
  }, 500);
}

if (window.location.hostname.includes('amazon.')) {
  console.log('[Product Lister] Amazon page detected:', window.location.href);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoInject);
  } else {
    initAutoInject();
  }
}


