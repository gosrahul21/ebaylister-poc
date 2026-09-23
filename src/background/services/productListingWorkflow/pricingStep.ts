import { AmazonProduct } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { PricingAiResult } from '../../../apis/gemini';
import { extractPricingFields } from '../schema';
import { fillListboxOption } from './listboxHelper';
import { fillInputField } from './formFieldHandlers';
import { buildImmediatePaymentCheckboxScript, buildAllowOffersToggleScript } from '../../injectors';
import { getGlobalSettings } from '../storageService';

const FORMAT_BUTTON_SELECTOR = 'button[name="format"], button[aria-labelledby*="format"], .format button.listbox-button__control, select[name="format"]';
const DURATION_BUTTON_SELECTOR = 'button[name="duration"], button[aria-labelledby*="duration"], .duration button.listbox-button__control, select[name="duration"]';

/**
 * Polls the DOM until the pricing section finishes re-rendering
 * and the expected field for the target format (e.g. "price" or "startPrice")
 * is mounted, interactive, and available in the DOM.
 */
async function waitForPricingSectionFields(
  debuggee: chrome.debugger.Debuggee,
  targetFormat: 'Buy It Now' | 'Auction',
  maxWaitMs: number = 10000,
  intervalMs: number = 400
): Promise<import('../../../types').FormFieldSchema[]> {
  const startTime = Date.now();
  const expectedFieldName = targetFormat === 'Auction' ? 'startPrice' : 'price';
  console.log(`[Pricing Step] Polling DOM for pricing section fields (waiting for "${expectedFieldName}")...`);

  // Initial short pause for framework transition to kick in
  await new Promise(r => setTimeout(r, 350));

  while (Date.now() - startTime < maxWaitMs) {
    const fields = await extractPricingFields(debuggee);
    const fieldMap = new Map(fields.map(f => [f.name, f]));

    if (fieldMap.has(expectedFieldName)) {
      console.log(`[Pricing Step] Polling succeeded! Detected target field "${expectedFieldName}" in DOM after ${Date.now() - startTime}ms.`);
      return fields;
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  console.warn(`[Pricing Step] Polling timed out after ${maxWaitMs}ms waiting for "${expectedFieldName}". Extracting currently rendered fields.`);
  return await extractPricingFields(debuggee);
}

/**
 * Calculates pricing plan deterministically from Global Settings and Amazon Product price (0ms, no API calls)
 */
export async function derivePricingPlanFromGlobalSettings(product: AmazonProduct): Promise<PricingAiResult> {
  const settings = await getGlobalSettings();
  const rawPriceNum = parseFloat(product.price ? product.price.replace(/[^0-9.]/g, '') || '19.99' : '19.99');
  const markedUpPrice = (rawPriceNum * (1 + (settings.markupPercentage ?? 15) / 100)).toFixed(2);
  const startPrice = (parseFloat(markedUpPrice) * ((settings.auctionBidPercentage ?? 70) / 100)).toFixed(2);

  return {
    format: settings.format || 'Buy It Now',
    price: markedUpPrice,
    startPrice: startPrice,
    duration: settings.auctionDuration || '7 days',
    quantity: '1',
    immediatePay: settings.immediatePay !== false,
    bestOfferEnabled: settings.allowOffers === true
  };
}

/**
 * Step: Dynamic Pricing Section Handler
 * 1. Calculates pricing plan deterministically from Global Settings & Amazon product price (0ms, no LLM call)
 * 2. Selects master format listbox dropdown via visual CDP cursor
 * 3. Polls DOM until loading state clears and format subfields mount
 * 4. Fills visible subfields (price, startPrice, duration, quantity, immediatePay)
 */
export async function executePricingStep(
  debuggee: chrome.debugger.Debuggee,
  targetProduct: AmazonProduct,
  currentPosition: Position
): Promise<Position> {
  console.log('[Pricing Step] Starting dynamic pricing step...');

  // 1. Derive pricing plan from Global Settings (0ms, no API call)
  const pricingPlan = await derivePricingPlanFromGlobalSettings(targetProduct);
  console.log('[Pricing Step] Derived pricing plan from Global Settings:', JSON.stringify(pricingPlan));

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

  // 3. Poll DOM for pricing section re-render until expected subfield ("price" or "startPrice") mounts
  const renderedFields = await waitForPricingSectionFields(debuggee, pricingPlan.format);
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

  // Allow offers toggle (runs for both Buy It Now and Auction)
  console.log(`[Pricing Step] Setting "Allow offers" toggle to: ${!!pricingPlan.bestOfferEnabled}`);
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildAllowOffersToggleScript(!!pricingPlan.bestOfferEnabled)
  });

  console.log('[Pricing Step] Dynamic pricing step successfully completed.');
  return currentPosition;
}
