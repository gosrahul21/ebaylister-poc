import { AmazonProduct } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { generateShippingValues, ShippingAiResult } from '../../../apis/gemini';
import { extractShippingFields } from '../schemaExtractor';
import { fillListboxOption } from './listboxHelper';
import { fillInputField } from './formFieldHandlers';

const SHIPPING_METHOD_BUTTON_SELECTOR = '.summary__shipping button[aria-labelledby*="domesticShippingType"], button[aria-labelledby*="domesticShippingType"], .summary__shipping--field button';

/**
 * Step: Dynamic Shipping Section Handler
 * 1. Asks AI for shipping method ("Standard shipping...", "Freight...", "No shipping...") + weight & dimensions
 * 2. Selects master shipping method listbox dropdown via visual CDP cursor
 * 3. Waits ~800ms for DOM re-render
 * 4. Re-extracts only the now-visible shipping subfields from .summary__shipping
 * 5. Fills visible subfields (majorWeight, minorWeight, packageLength, packageWidth, packageDepth)
 */
export async function executeShippingStep(
  debuggee: chrome.debugger.Debuggee,
  targetProduct: AmazonProduct,
  currentPosition: Position
): Promise<Position> {
  console.log('[Shipping Step] Starting dynamic shipping step...');

  // 1. Get AI shipping recommendations
  let shippingPlan: ShippingAiResult;
  try {
    shippingPlan = await generateShippingValues(targetProduct);
    console.log('[Shipping Step] Gemini determined shipping plan:', JSON.stringify(shippingPlan));
  } catch (err) {
    console.warn('[Shipping Step] AI shipping generation failed, using defaults:', err);
    shippingPlan = {
      domesticShippingType: 'Standard shipping: Small to medium items',
      majorWeight: '1',
      minorWeight: '0',
      packageLength: '8',
      packageWidth: '6',
      packageDepth: '4'
    };
  }

  // 2. Select the Master Shipping Method dropdown (eBay custom listbox)
  try {
    currentPosition = await fillListboxOption(
      debuggee,
      SHIPPING_METHOD_BUTTON_SELECTOR,
      shippingPlan.domesticShippingType,
      currentPosition
    );
  } catch (err) {
    console.warn('[Shipping Step] Failed to select shipping method listbox option:', err);
  }

  // 3. Wait for DOM re-render (~800ms)
  console.log('[Shipping Step] Waiting 800ms for shipping section DOM re-render...');
  await new Promise(r => setTimeout(r, 800));

  // 4. Re-extract subfields present in the updated DOM
  const renderedFields = await extractShippingFields(debuggee);
  const fieldMap = new Map(renderedFields.map(f => [f.name, f]));
  console.log(`[Shipping Step] Rendered fields count: ${renderedFields.length}. Fields: ${Array.from(fieldMap.keys()).join(', ')}`);

  // 5. Fill only the package details subfields that exist in the rendered DOM
  // Major Weight (lbs) - present in Standard and Freight
  const majorWeightField = fieldMap.get('majorWeight');
  if (majorWeightField && shippingPlan.majorWeight) {
    console.log(`[Shipping Step] Populating Major Weight (lbs): "${shippingPlan.majorWeight}"`);
    currentPosition = await fillInputField(debuggee, majorWeightField, shippingPlan.majorWeight, currentPosition);
  }

  // Minor Weight (oz) - only present in Standard shipping, not in Freight or No Shipping!
  const minorWeightField = fieldMap.get('minorWeight');
  if (minorWeightField && shippingPlan.minorWeight) {
    console.log(`[Shipping Step] Populating Minor Weight (oz): "${shippingPlan.minorWeight}"`);
    currentPosition = await fillInputField(debuggee, minorWeightField, shippingPlan.minorWeight, currentPosition);
  }

  // Package Length (inches)
  const lengthField = fieldMap.get('packageLength');
  if (lengthField && shippingPlan.packageLength) {
    console.log(`[Shipping Step] Populating Package Length (in): "${shippingPlan.packageLength}"`);
    currentPosition = await fillInputField(debuggee, lengthField, shippingPlan.packageLength, currentPosition);
  }

  // Package Width (inches)
  const widthField = fieldMap.get('packageWidth');
  if (widthField && shippingPlan.packageWidth) {
    console.log(`[Shipping Step] Populating Package Width (in): "${shippingPlan.packageWidth}"`);
    currentPosition = await fillInputField(debuggee, widthField, shippingPlan.packageWidth, currentPosition);
  }

  // Package Depth (inches)
  const depthField = fieldMap.get('packageDepth');
  if (depthField && shippingPlan.packageDepth) {
    console.log(`[Shipping Step] Populating Package Depth (in): "${shippingPlan.packageDepth}"`);
    currentPosition = await fillInputField(debuggee, depthField, shippingPlan.packageDepth, currentPosition);
  }

  console.log('[Shipping Step] Dynamic shipping step successfully completed.');
  return currentPosition;
}
