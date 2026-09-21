import { AmazonProduct } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { generatePricingValues, PricingAiResult } from '../../../apis/gemini';
import { extractPricingFields } from '../schemaExtractor';
import { fillListboxOption } from './listboxHelper';
import { fillInputField } from './formFieldHandlers';
import { buildImmediatePaymentCheckboxScript } from '../../injectors';

const FORMAT_BUTTON_SELECTOR = '.format button.listbox-button__control, button[aria-labelledby*="format"], .summary__price .format button';
const DURATION_BUTTON_SELECTOR = 'button[aria-labelledby*="duration"], .summary__price button[aria-labelledby*="duration"]';

/**
 * Step: Dynamic Pricing Section Handler
 * 1. Asks AI for format (Buy It Now vs Auction) + subfield values
 * 2. Selects master format listbox dropdown via visual CDP cursor
 * 3. Waits ~800ms for DOM re-render
 * 4. Re-extracts only the now-visible pricing subfields from .summary__price
 * 5. Fills visible subfields (price, startPrice, duration, quantity, immediatePay)
 */
export async function executePricingStep(
  debuggee: chrome.debugger.Debuggee,
  targetProduct: AmazonProduct,
  currentPosition: Position
): Promise<Position> {
  console.log('[Pricing Step] Starting dynamic pricing step...');

  // 1. Get AI pricing recommendations
  let pricingPlan: PricingAiResult;
  try {
    pricingPlan = await generatePricingValues(targetProduct);
    console.log('[Pricing Step] Gemini determined pricing plan:', JSON.stringify(pricingPlan));
  } catch (err) {
    console.warn('[Pricing Step] AI pricing generation failed, using defaults:', err);
    const cleanPrice = targetProduct.price ? targetProduct.price.replace(/[^0-9.]/g, '') || '19.99' : '19.99';
    pricingPlan = {
      format: 'Buy It Now',
      price: cleanPrice,
      quantity: '1',
      immediatePay: true
    };
  }

  // 2. Select the Master Format dropdown (eBay custom listbox)
  try {
    currentPosition = await fillListboxOption(
      debuggee,
      FORMAT_BUTTON_SELECTOR,
      pricingPlan.format,
      currentPosition
    );
  } catch (err) {
    console.warn('[Pricing Step] Failed to select format listbox option:', err);
  }

  // 3. Wait for DOM re-render (~800ms)
  console.log('[Pricing Step] Waiting 800ms for pricing section DOM re-render...');
  await new Promise(r => setTimeout(r, 800));

  // 4. Re-extract subfields present in the updated DOM
  const renderedFields = await extractPricingFields(debuggee);
  const fieldMap = new Map(renderedFields.map(f => [f.name, f]));
  console.log(`[Pricing Step] Rendered fields count: ${renderedFields.length}. Fields: ${Array.from(fieldMap.keys()).join(', ')}`);

  // 5. Fill only the subfields that exist in the rendered DOM
  if (pricingPlan.format === 'Auction') {
    // Auction Starting Bid
    const startPriceField = fieldMap.get('startPrice');
    if (startPriceField && (pricingPlan.startPrice || pricingPlan.price)) {
      const bidVal = pricingPlan.startPrice || (parseFloat(pricingPlan.price) * 0.7).toFixed(2);
      console.log(`[Pricing Step] Populating Starting bid: $${bidVal}`);
      currentPosition = await fillInputField(debuggee, startPriceField, bidVal, currentPosition);
    }

    // Auction Duration
    const durationField = fieldMap.get('duration');
    if (durationField && pricingPlan.duration) {
      console.log(`[Pricing Step] Selecting Auction duration: "${pricingPlan.duration}"`);
      try {
        currentPosition = await fillListboxOption(
          debuggee,
          DURATION_BUTTON_SELECTOR,
          pricingPlan.duration,
          currentPosition
        );
      } catch (durErr) {
        console.warn('[Pricing Step] Could not set auction duration:', durErr);
      }
    }

    // Optional Buy It Now price during Auction
    const priceField = fieldMap.get('price');
    if (priceField && pricingPlan.price && pricingPlan.startPrice) {
      console.log(`[Pricing Step] Populating Auction Buy It Now price: $${pricingPlan.price}`);
      currentPosition = await fillInputField(debuggee, priceField, pricingPlan.price, currentPosition);
    }
  } else {
    // Buy It Now: Item Price
    const priceField = fieldMap.get('price');
    if (priceField && pricingPlan.price) {
      console.log(`[Pricing Step] Populating Buy It Now price: $${pricingPlan.price}`);
      currentPosition = await fillInputField(debuggee, priceField, pricingPlan.price, currentPosition);
    }

    // Buy It Now: Quantity
    const qtyField = fieldMap.get('quantity');
    if (qtyField && pricingPlan.quantity) {
      console.log(`[Pricing Step] Populating Quantity: ${pricingPlan.quantity}`);
      currentPosition = await fillInputField(debuggee, qtyField, pricingPlan.quantity, currentPosition);
    }

    // Immediate Payment checkbox
    if (pricingPlan.immediatePay && fieldMap.has('immediatePay')) {
      console.log('[Pricing Step] Ensuring "Require immediate payment" checkbox is checked');
      await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
        expression: buildImmediatePaymentCheckboxScript()
      });
    }
  }

  console.log('[Pricing Step] Dynamic pricing step successfully completed.');
  return currentPosition;
}
