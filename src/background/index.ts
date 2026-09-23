import { ExtensionAction, ExtensionRequest, ExtensionResponse } from '../types';
import {
  updateBadgeCount,
  getSavedProducts,
  saveProduct,
  deleteProduct,
  clearAllProducts,
  getFormSchema,
  saveGeminiApiKey,
  getGeminiApiKey,
  getGlobalSettings,
  saveGlobalSettings
} from './services/storageService';
import { automateEbayListing } from './services/ebayAutomator';

// Background Service Worker Message Listener 
chrome.runtime.onMessage.addListener(
  (request: ExtensionRequest, _sender, sendResponse: (res: ExtensionResponse) => void) => {
    if (request.action === ExtensionAction.SAVE_AMAZON_PRODUCT) {
      saveProduct(request.product)
        .then(() => sendResponse({ success: true, product: request.product }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to save product' }));
      return true;
    }

    if (request.action === ExtensionAction.GET_SAVED_PRODUCTS) {
      getSavedProducts()
        .then(products => sendResponse({ success: true, products }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to fetch saved products' }));
      return true;
    }

    if (request.action === ExtensionAction.DELETE_SAVED_PRODUCT) {
      deleteProduct(request.id)
        .then(products => sendResponse({ success: true, products }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to delete product' }));
      return true;
    }

    if (request.action === ExtensionAction.CLEAR_ALL_SAVED_PRODUCTS) {
      clearAllProducts()
        .then(products => sendResponse({ success: true, products }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to clear products' }));
      return true;
    }

    if (request.action === ExtensionAction.AUTOMATE_EBAY_LISTING) {
      automateEbayListing(request.categoryQuery, request.product)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed eBay automation' }));
      return true;
    }

    if (request.action === ExtensionAction.GET_FORM_SCHEMA) {
      getFormSchema()
        .then(schema => sendResponse({ success: true, schema }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to fetch form schema' }));
      return true;
    }

    if (request.action === ExtensionAction.SAVE_GEMINI_API_KEY) {
      saveGeminiApiKey(request.apiKey)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to save Gemini API key' }));
      return true;
    }

    if (request.action === ExtensionAction.GET_GEMINI_API_KEY) {
      getGeminiApiKey()
        .then(apiKey => sendResponse({ success: true, apiKey: apiKey || undefined }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to get Gemini API key' }));
      return true;
    }

    if (request.action === ExtensionAction.GET_GLOBAL_SETTINGS) {
      getGlobalSettings()
        .then(settings => sendResponse({ success: true, settings }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to get global settings' }));
      return true;
    }

    if (request.action === ExtensionAction.SAVE_GLOBAL_SETTINGS) {
      saveGlobalSettings(request.settings)
        .then(settings => sendResponse({ success: true, settings }))
        .catch(err => sendResponse({ success: false, error: err.message || 'Failed to save global settings' }));
      return true;
    }
  }
);

// Initial badge update on service worker start
updateBadgeCount();

