import { AmazonProduct } from '../types';
import { PopupElementId } from './constants';
import { getSavedProducts, saveProduct, clearAllProducts, exportProductsJson } from './services/productDataService';
import { checkActiveTabAndScrapeProduct, TabBannerUI } from './services/activeTabService';
import { renderProductsList, filterProducts } from './components/productListView';
import { initProductDetailsModal } from './components/productDetailsModal';
import { initSettingsModal } from './components/settingsModal';

document.addEventListener('DOMContentLoaded', () => {
  // Banner & Action Elements
  const countBadge = document.getElementById(PopupElementId.COUNT_BADGE) as HTMLDivElement;
  const bannerDot = document.getElementById(PopupElementId.BANNER_DOT) as HTMLDivElement;
  const bannerStatusText = document.getElementById(PopupElementId.BANNER_STATUS_TEXT) as HTMLSpanElement;
  const saveCurrentBtn = document.getElementById(PopupElementId.SAVE_CURRENT_BTN) as HTMLButtonElement;
  const saveBtnText = document.getElementById(PopupElementId.SAVE_BTN_TEXT) as HTMLSpanElement;
  const searchInput = document.getElementById(PopupElementId.SEARCH_INPUT) as HTMLInputElement;
  const productsList = document.getElementById(PopupElementId.PRODUCTS_LIST) as HTMLDivElement;
  const exportJsonBtn = document.getElementById(PopupElementId.EXPORT_JSON_BTN) as HTMLButtonElement;
  const clearAllBtn = document.getElementById(PopupElementId.CLEAR_ALL_BTN) as HTMLButtonElement;

  // Details Modal Elements
  const detailsModal = document.getElementById(PopupElementId.DETAILS_MODAL) as HTMLDivElement;
  const closeModalBtn = document.getElementById(PopupElementId.CLOSE_MODAL_BTN) as HTMLButtonElement;
  const modalProductAsin = document.getElementById(PopupElementId.MODAL_PRODUCT_ASIN) as HTMLHeadingElement;
  const modalBodyContent = document.getElementById(PopupElementId.MODAL_BODY_CONTENT) as HTMLDivElement;

  // Settings Elements
  const openSettingsBtn = document.getElementById(PopupElementId.OPEN_SETTINGS_BTN) as HTMLButtonElement;
  const settingsModal = document.getElementById(PopupElementId.SETTINGS_MODAL) as HTMLDivElement;
  const closeSettingsModalBtn = document.getElementById(PopupElementId.CLOSE_SETTINGS_MODAL_BTN) as HTMLButtonElement;
  const settingMarkupPct = document.getElementById(PopupElementId.SETTING_MARKUP_PCT) as HTMLInputElement;
  const settingFormat = document.getElementById(PopupElementId.SETTING_FORMAT) as HTMLSelectElement;
  const settingBidPct = document.getElementById(PopupElementId.SETTING_BID_PCT) as HTMLInputElement;
  const settingDuration = document.getElementById(PopupElementId.SETTING_DURATION) as HTMLSelectElement;
  const settingImmediatePay = document.getElementById(PopupElementId.SETTING_IMMEDIATE_PAY) as HTMLInputElement;
  const settingAllowOffers = document.getElementById(PopupElementId.SETTING_ALLOW_OFFERS) as HTMLInputElement;
  const saveSettingsBtn = document.getElementById(PopupElementId.SAVE_SETTINGS_BTN) as HTMLButtonElement;
  const auctionSettingsGroup = document.getElementById(PopupElementId.AUCTION_SETTINGS_GROUP) as HTMLDivElement;

  let allProducts: AmazonProduct[] = [];
  let activeProductToSave: AmazonProduct | null = null;

  const bannerUI: TabBannerUI = {
    bannerDot,
    bannerStatusText,
    saveCurrentBtn,
    saveBtnText
  };

  // Initialize Details Modal
  const { openProductModal } = initProductDetailsModal({
    detailsModal,
    closeModalBtn,
    modalProductAsin,
    modalBodyContent
  });

  // Initialize Settings Modal
  initSettingsModal({
    openSettingsBtn,
    settingsModal,
    closeSettingsModalBtn,
    settingMarkupPct,
    settingFormat,
    settingBidPct,
    settingDuration,
    settingImmediatePay,
    settingAllowOffers,
    saveSettingsBtn,
    auctionSettingsGroup
  });

  function updateUI(): void {
    getSavedProducts(products => {
      allProducts = products;
      countBadge.textContent = `${allProducts.length} Saved`;
      renderProductsList(productsList, filterProducts(allProducts, searchInput.value.trim()), {
        onViewProduct: openProductModal,
        onProductDeleted: updateUI
      });
    });
  }

  checkActiveTabAndScrapeProduct(bannerUI, scrapedProduct => {
    activeProductToSave = scrapedProduct;
  });

  saveCurrentBtn.addEventListener('click', () => {
    if (!activeProductToSave) return;

    saveCurrentBtn.disabled = true;
    saveBtnText.textContent = 'Saving product details...';

    saveProduct(activeProductToSave, (success, error) => {
      saveCurrentBtn.disabled = false;
      saveBtnText.textContent = 'Save Current Amazon Product';

      if (success) {
        updateUI();
      } else {
        alert(`Error saving product: ${error || 'Unknown error'}`);
      }
    });
  });

  searchInput.addEventListener('input', () => {
    renderProductsList(productsList, filterProducts(allProducts, searchInput.value.trim()), {
      onViewProduct: openProductModal,
      onProductDeleted: updateUI
    });
  });

  clearAllBtn.addEventListener('click', () => {
    if (allProducts.length === 0) return;
    if (confirm('Are you sure you want to delete ALL saved Amazon products?')) {
      clearAllProducts(() => {
        updateUI();
      });
    }
  });

  exportJsonBtn.addEventListener('click', () => {
    exportProductsJson(allProducts);
  });

  // Initial load of saved products list
  updateUI();
});
