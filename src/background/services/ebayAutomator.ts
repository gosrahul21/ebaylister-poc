import { AmazonProduct } from '../../types';
import { DEFAULT_MOCK_PRODUCT } from './storageService';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { injectVisualCursor } from './cdpHelper';
import { executeSearchStep } from './productListingWorkflow/searchSuggestStep';
import { executeIdentifyStep } from './productListingWorkflow/identifyStep';
import { executeConditionStep } from './productListingWorkflow/conditionStep';
import { executeListingFormStep } from './productListingWorkflow/formFillStep';

/**
 * Automates opening eBay prelist suggest page and simulating CDP human mouse clicks through:
 * 1. Search button on prelist suggest page
 * 2. "Continue without match" on identify step
 * 3. Condition selection ("New") on confirm details modal
 * 4. Main listing form (photos, title, and AI-driven form fields)
 */
export async function automateEbayListing(
  categoryQuery: string | string[],
  product?: AmazonProduct
): Promise<void> {
  const cleanCategories = Array.isArray(categoryQuery)
    ? categoryQuery.map(c => (c || '').trim()).filter(Boolean)
    : [];

  const queryText = cleanCategories.length > 0
    ? cleanCategories[cleanCategories.length - 1]
    : (typeof categoryQuery === 'string' ? categoryQuery.trim() : '');

  const ebayUrl = `https://www.ebay.com/sl/prelist/suggest?title=${encodeURIComponent(queryText)}`;
  const tab = await chrome.tabs.create({ url: ebayUrl, active: true });
  if (!tab.id) return;

  const tabId = tab.id;

  const runAutomation = async () => {
    // Brief pause to allow eBay scripts to initialize DOM
    await new Promise(r => setTimeout(r, 1200));

    const debuggee = { tabId };
    try {
      console.log(`[CDP eBay Automator] Attaching debugger to eBay tab ${tabId}...`);
      await chrome.debugger.attach(debuggee, '1.3');
      await injectVisualCursor(debuggee);

      let currentPosition: Position = {
        x: Math.floor(Math.random() * 200) + 50,
        y: Math.floor(Math.random() * 100) + 40
      };

      currentPosition = await executeSearchStep(debuggee, currentPosition);
      currentPosition = await executeIdentifyStep(debuggee, tabId, currentPosition);
      currentPosition = await executeConditionStep(debuggee, currentPosition);

      const targetProduct = product || DEFAULT_MOCK_PRODUCT;
      await executeListingFormStep(debuggee, tabId, currentPosition, targetProduct);

      console.log('[CDP eBay Automator] All listing form fields populated successfully!');
    } catch (err) {
      console.error('[CDP eBay Automator] Automation error:', err);
    } finally {
      chrome.debugger.detach(debuggee).catch(() => {});
      console.log('[CDP eBay Automator] Debugger detached');
    }
  };

  if (tab.status === 'complete') {
    runAutomation();
  } else {
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        runAutomation();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  }
}
