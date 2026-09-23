import { AmazonProduct, ExtensionAction, ExtensionResponse } from '../../types';

export function getSavedProducts(callback: (products: AmazonProduct[]) => void): void {
  chrome.runtime.sendMessage({ action: ExtensionAction.GET_SAVED_PRODUCTS }, (res: ExtensionResponse) => {
    if (res && res.success && res.products) {
      callback(res.products);
    }
  });
}

export function saveProduct(product: AmazonProduct, callback: (success: boolean, error?: string) => void): void {
  chrome.runtime.sendMessage(
    { action: ExtensionAction.SAVE_AMAZON_PRODUCT, product },
    (res: ExtensionResponse) => {
      if (res && res.success) {
        callback(true);
      } else {
        callback(false, res && 'error' in res ? res.error : 'Unknown error');
      }
    }
  );
}

export function deleteProductItem(id: string, callback: (success: boolean) => void): void {
  chrome.runtime.sendMessage({ action: ExtensionAction.DELETE_SAVED_PRODUCT, id }, (res: ExtensionResponse) => {
    callback(Boolean(res && res.success));
  });
}

export function clearAllProducts(callback: () => void): void {
  chrome.runtime.sendMessage({ action: ExtensionAction.CLEAR_ALL_SAVED_PRODUCTS }, () => {
    callback();
  });
}

export function exportProductsJson(products: AmazonProduct[]): void {
  if (products.length === 0) {
    alert('No saved products to export.');
    return;
  }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `amazon_saved_products_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function automateEbayListing(product: AmazonProduct, callback: () => void): void {
  const categoryQuery = product.categoryPath && product.categoryPath.length > 0
    ? product.categoryPath
    : (product.category || product.title);

  chrome.runtime.sendMessage(
    { action: ExtensionAction.AUTOMATE_EBAY_LISTING, categoryQuery, product: product },
    () => {
      setTimeout(callback, 1500);
    }
  );
}
