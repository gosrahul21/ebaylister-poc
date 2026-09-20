import { ExtensionAction, ExtensionRequest, ExtensionResponse } from '../types';
import { extractAmazonProductDetails } from './helpers/extractAmazonProductDetails';

// ── Floating Page Action Overlay (Shadow DOM Isolated) ────────────────────────
function injectFloatingSaveButton() {
  if (document.getElementById('amazon-product-saver-root')) return;

  const rootHost = document.createElement('div');
  rootHost.id = 'amazon-product-saver-root';
  rootHost.style.cssText = `
    all: initial !important;
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
  `;

  const shadow = rootHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .saver-pill-button {
      all: unset !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px !important;
      padding: 12px 22px !important;
      background: linear-gradient(135deg, #131921 0%, #232f3e 100%) !important;
      color: #ff9900 !important;
      border: 2px solid #ff9900 !important;
      border-radius: 50px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 153, 0, 0.4) !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease !important;
      user-select: none !important;
      box-sizing: border-box !important;
      line-height: 1 !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    .saver-pill-button:hover {
      transform: translateY(-3px) scale(1.04) !important;
      box-shadow: 0 14px 35px rgba(255, 153, 0, 0.55), 0 0 20px rgba(255, 153, 0, 0.6) !important;
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%) !important;
    }
    .saver-pill-button:active {
      transform: translateY(-1px) scale(0.98) !important;
    }
    .saver-toast {
      position: fixed !important;
      bottom: 84px !important;
      right: 24px !important;
      padding: 12px 20px !important;
      background: #10b981 !important;
      color: #ffffff !important;
      border-radius: 12px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4) !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    }
    .saver-toast.error {
      background: #ef4444 !important;
    }
  `;

  const btn = document.createElement('button');
  btn.className = 'saver-pill-button';
  btn.innerHTML = `
    <span style="font-size: 18px; line-height: 1;">🛍️</span>
    <span id="btn-label" style="font-size: 14px; font-weight: 700; color: #ff9900;">Save Product Details</span>
  `;

  btn.addEventListener('click', () => {
    const label = btn.querySelector('#btn-label') as HTMLSpanElement;
    const product = extractAmazonProductDetails();
    if (!product) {
      showShadowToast(shadow, '❌ Could not extract product details on this page.', true);
      return;
    }

    btn.style.pointerEvents = 'none';
    if (label) label.innerText = '⏳ Saving product...';

    chrome.runtime.sendMessage(
      { action: ExtensionAction.SAVE_AMAZON_PRODUCT, product },
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

  const container = document.body || document.documentElement;
  if (container) {
    container.appendChild(rootHost);
    console.log('[Product Lister] Floating Shadow DOM save button successfully injected into Amazon page!');
  }
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

// Auto-inject floating save button on Amazon pages
function isAmazonDomain(): boolean {
  return window.location.hostname.includes('amazon.');
}

function initAutoInject() {
  if (isAmazonDomain()) {
    injectFloatingSaveButton();
  }
}

if (isAmazonDomain()) {
  console.log('[Product Lister] Amazon page script loaded:', window.location.href);

  // Try immediate injection
  if (document.body || document.documentElement) {
    initAutoInject();
  }

  // Also bind DOM events to guarantee injection as page loads
  document.addEventListener('DOMContentLoaded', initAutoInject);
  window.addEventListener('load', initAutoInject);

  // Periodic polling safety net to prevent dynamic SPA cleanups
  let pollCount = 0;
  const timer = setInterval(() => {
    pollCount++;
    if (!document.getElementById('amazon-product-saver-root')) {
      initAutoInject();
    }
    if (pollCount > 20) {
      clearInterval(timer);
    }
  }, 500);
}
