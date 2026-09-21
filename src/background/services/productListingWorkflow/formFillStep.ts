import { AmazonProduct } from '../../../types';
import { extractFormSchema } from '../schemaExtractor';
import { uploadProductImages } from './imageUpload';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import {
  ensureDebuggerAttached,
  injectVisualCursor,
  waitForUrlAndComplete
} from '../cdpHelper';
import { closeOpenMenus, updateListingTitle } from './formFieldHandlers';
import { fillAiFormFields } from './aiFormFiller';
import { executePricingStep } from './pricingStep';
import { executeShippingStep } from './shippingStep';

/**
 * Step 4: Handles the main listing form (/lstng?draftId=...) by:
 * 1. Waiting for the listing form page to complete loading
 * 2. Dynamically extracting form schema
 * 3. Uploading product images from web
 * 4. Updating the item title
 * 5. Executing dynamic Pricing step (Select-Then-Re-Extract)
 * 6. Executing dynamic Shipping step (Select-Then-Re-Extract)
 * 7. Populating remaining form fields using Gemini AI
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

  // 4a. Inspect DOM and extract complete form schema
  const formSchema = await extractFormSchema(debuggee);

  // 4b. Ensure any open popover dropdown menus are closed first
  await closeOpenMenus(debuggee);

  // 4c. Photo Upload ("Upload from web" button directly in uploader canvas)
  const uploadPos = await uploadProductImages(debuggee, targetProduct, currentPosition.x, currentPosition.y);
  currentPosition = { x: uploadPos.curX, y: uploadPos.curY };

  // 4d. Fill Title Input
  currentPosition = await updateListingTitle(debuggee, targetProduct.title, currentPosition);

  // description
  // item specifics essentials/optional
  // 4e. AI-Driven Schema Fill – Call Gemini to populate all remaining form fields
  if (formSchema && formSchema.allFields.length > 0) {
    currentPosition = await fillAiFormFields(debuggee, targetProduct, formSchema, currentPosition);
  } else {
    console.warn('[CDP eBay Automator] Step 4c - No schema available. Skipping AI form fill.');
  }


  // 4e. Dynamic Pricing (Select master format, re-extract subfields, populate prices/duration)
  currentPosition = await executePricingStep(debuggee, targetProduct, currentPosition);

  // 4f. Dynamic Shipping (Select shipping method, re-extract subfields, populate weights/dims)
  currentPosition = await executeShippingStep(debuggee, targetProduct, currentPosition);

  // preferances

  // disclosure

  // promote your listing 


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
