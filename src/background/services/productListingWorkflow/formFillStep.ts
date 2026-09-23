import { AmazonProduct, FieldValueMapping, ListingFormSchema } from '../../../types';
import { extractFormSchema } from '../schema';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import {
  ensureDebuggerAttached,
  injectVisualCursor,
  waitForUrlAndComplete
} from '../cdpHelper';
import { closeOpenMenus, updateListingTitle } from './formFieldHandlers';
import { getProductListingFormValues } from './aiFormFiller';
import { executePricingStep } from './pricingStep';
import { executeShippingStep } from './shippingStep';
import { fillItemSpecifics } from './fillItemSpecifics';
import { fillDescription } from './fillDescription';
import { uploadProductImages } from './imageUpload';

/**
 * Step 4: Handles the main listing form (/lstng?draftId=...) by:
 * 1. Waiting for the listing form page to complete loading
 * 2. Dynamically extracting form schema
 * 3. Uploading product images from web
 * 4. Updating the item title
 * 5. Filling Item Specifics (top-to-bottom UI order)
 * 6. Filling Description
 * 7. Executing dynamic Pricing step
 * 8. Executing dynamic Shipping step
 */
export async function executeListingFormStep(
  debuggee: chrome.debugger.Debuggee,
  tabId: number,
  currentPosition: Position,
  targetProduct: AmazonProduct
): Promise<Position> {
  console.log('[CDP eBay Automator] Step 4 - Waiting for main listing form (/lstng?draftId) to load...');
  await waitForUrlAndComplete(tabId, 'lstng', 25000);
  await new Promise(r => setTimeout(r, 2500));
  await ensureDebuggerAttached(debuggee);
  await injectVisualCursor(debuggee);
  await closeOpenMenus(debuggee);

  // 4a. Photo Upload ("Upload from web" button directly in uploader canvas)
  const uploadPos = await uploadProductImages(debuggee, targetProduct, currentPosition.x, currentPosition.y);
  currentPosition = { x: uploadPos.curX, y: uploadPos.curY };

  // 4b. Inspect DOM and extract complete form schema
  const formSchema: ListingFormSchema | null = await extractFormSchema(debuggee);
  const productFormValues: FieldValueMapping[] = await getProductListingFormValues();
  await new Promise(res => setTimeout(res, 5000));

  // 4c. Fill Title Input
  currentPosition = await updateListingTitle(debuggee, targetProduct.title, currentPosition);
  await closeOpenMenus(debuggee);

  // 4d. Item Specifics (dynamic visual UI order)
  if (formSchema && productFormValues.length > 0) {
    currentPosition = await fillItemSpecifics(debuggee, currentPosition, targetProduct);
  }

  // 4e. Description
  currentPosition = await fillDescription(debuggee, targetProduct, productFormValues, currentPosition);

  // 4f. Dynamic Pricing (Format selection, subfields, immediate pay, allow offers)
  currentPosition = await executePricingStep(debuggee, targetProduct, currentPosition);

  // 4g. Dynamic Shipping (Method selection, weights/dimensions)
  currentPosition = await executeShippingStep(debuggee, targetProduct, currentPosition);

  return currentPosition;
}

export { fillAiFormFields } from './aiFormFiller';
export { executePricingStep } from './pricingStep';
export { executeShippingStep } from './shippingStep';
export {
  closeOpenMenus,
  updateListingTitle,
  fillDropdownField,
  fillSelectField,
  fillInputField
} from './formFieldHandlers';
