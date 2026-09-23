import { AmazonProduct, ExtensionAction, ExtensionResponse } from '../../types';

export interface TabBannerUI {
  bannerDot: HTMLDivElement;
  bannerStatusText: HTMLSpanElement;
  saveCurrentBtn: HTMLButtonElement;
  saveBtnText: HTMLSpanElement;
}

export function setTabBanner(ui: TabBannerUI, isAmazon: boolean, message: string, readyToSave = false): void {
  ui.bannerDot.className = isAmazon ? 'pulse-dot' : 'pulse-dot off';
  ui.bannerStatusText.textContent = message;
  ui.saveCurrentBtn.disabled = !readyToSave;
  ui.saveBtnText.textContent = readyToSave ? 'Save Current Amazon Product' : 'Save Current Product';
}

export function checkActiveTabAndScrapeProduct(
  ui: TabBannerUI,
  onProductScraped: (product: AmazonProduct) => void
): void {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab || !tab.id || !tab.url) {
      setTabBanner(ui, false, 'No active web page detected.');
      return;
    }

    const isAmazon = tab.url.includes('amazon.');
    if (!isAmazon) {
      setTabBanner(ui, false, 'Not an Amazon page (Open an Amazon product page to save details).');
      return;
    }

    setTabBanner(ui, true, 'Amazon page detected. Fetching details...');

    chrome.tabs.sendMessage(
      tab.id,
      { action: ExtensionAction.SCRAPE_AMAZON_PRODUCT },
      (response: ExtensionResponse) => {
        if (chrome.runtime.lastError || !response || !response.success || !response.product) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id! },
              files: ['content.js']
            },
            () => {
              chrome.tabs.sendMessage(
                tab.id!,
                { action: ExtensionAction.SCRAPE_AMAZON_PRODUCT },
                (retryRes: ExtensionResponse) => {
                  if (retryRes && retryRes.success && retryRes.product) {
                    onProductScraped(retryRes.product);
                    setTabBanner(ui, true, `Ready to save "${retryRes.product.title.slice(0, 32)}..."`, true);
                  } else {
                    setTabBanner(ui, false, 'Amazon page detected, but not on a product details page.');
                  }
                }
              );
            }
          );
          return;
        }

        onProductScraped(response.product);
        setTabBanner(ui, true, `Ready to save "${response.product.title.slice(0, 32)}..."`, true);
      }
    );
  });
}
