import { AmazonProduct, FieldValueMapping, ListingFormSchema } from '../types';
import { buildListingFormPrompt } from './prompts/listingFormPrompt';
import {
  buildPricingPrompt,
  buildShippingPrompt,
  PricingAiResult,
  ShippingAiResult
} from './prompts/pricingShippingPrompts';
import {
  saveLatestGeminiResponse,
  getGeminiApiKey,
  saveGeminiApiKey
} from '../background/services/storageService';

export { getGeminiApiKey, saveGeminiApiKey };
export type { PricingAiResult, ShippingAiResult };

const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GeminiResponsePayload {
  fieldValues: FieldValueMapping[];
}

/**
 * Invokes Gemini REST API to determine listing form values from product data & schema.
 */
export async function generateListingFormValues(
  product: AmazonProduct,
  schema: ListingFormSchema,
  apiKeyOverride?: string
): Promise<FieldValueMapping[]> {
  const apiKey = apiKeyOverride || (await getGeminiApiKey());
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please save your API key in extension storage or pass it as an argument.');
  }

  const { systemInstruction, userPrompt } = buildListingFormPrompt(product, schema);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('Gemini API returned an empty or invalid response.');
  }

  try {
    const parsed: GeminiResponsePayload = JSON.parse(textContent);
    
    // Save the response to extension storage via storageService
    await saveLatestGeminiResponse(parsed);
    console.log('================ GEMINI API RESPONSE SAVED ================');
    console.log(JSON.stringify(parsed, null, 2));
    console.log('===========================================================');
    
    return parsed.fieldValues || [];
  } catch (err) {
    console.error('[Gemini API] Failed to parse JSON response:', textContent);
    throw new Error('Failed to parse JSON response from Gemini API.');
  }
}

/**
 * Invokes Gemini REST API to determine pricing format (Buy It Now vs Auction) and subfield prices.
 */
export async function generatePricingValues(
  product: AmazonProduct,
  apiKeyOverride?: string
): Promise<PricingAiResult> {
  const defaultPrice = product.price ? product.price.replace(/[^0-9.]/g, '') || '19.99' : '19.99';
  const fallbackResult: PricingAiResult = {
    format: 'Buy It Now',
    price: defaultPrice,
    quantity: '1',
    immediatePay: true,
    bestOfferEnabled: false
  };

  try {
    const apiKey = apiKeyOverride || (await getGeminiApiKey());
    if (!apiKey) return fallbackResult;

    const { systemInstruction, userPrompt } = buildPricingPrompt(product);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.2, topP: 0.95, responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) return fallbackResult;
    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return fallbackResult;

    const parsed = JSON.parse(textContent);
    return {
      format: parsed.format === 'Auction' ? 'Auction' : 'Buy It Now',
      price: parsed.price ? String(parsed.price).replace(/[^0-9.]/g, '') : defaultPrice,
      startPrice: parsed.startPrice ? String(parsed.startPrice).replace(/[^0-9.]/g, '') : undefined,
      duration: parsed.duration || '7 days',
      quantity: parsed.quantity ? String(parsed.quantity).replace(/[^0-9]/g, '') : '1',
      immediatePay: parsed.immediatePay !== false,
      bestOfferEnabled: !!parsed.bestOfferEnabled
    };
  } catch (err) {
    console.warn('[Gemini API] Pricing AI call failed, using fallback values:', err);
    return fallbackResult;
  }
}

/**
 * Invokes Gemini REST API to determine shipping method, estimated weight, and dimensions.
 */
export async function generateShippingValues(
  product: AmazonProduct,
  apiKeyOverride?: string
): Promise<ShippingAiResult> {
  // Parse specifications for dimensions and weight as fallback
  const specs = product.specifications || {};
  let defaultMajor = '1';
  let defaultMinor = '0';
  let defaultLength = '8';
  let defaultWidth = '6';
  let defaultDepth = '4';

  const weightStr = specs['Item Weight'] || specs['Package Weight'] || '';
  const weightMatch = weightStr.match(/([0-9.]+)\s*(pounds|lbs|lb|ounces|oz)/i);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    const unit = weightMatch[2].toLowerCase();
    if (unit.startsWith('oz')) {
      defaultMajor = '0';
      defaultMinor = Math.min(15, Math.round(val)).toString();
    } else {
      defaultMajor = Math.floor(val).toString();
      defaultMinor = Math.round((val - Math.floor(val)) * 16).toString();
    }
  }

  const dimStr = specs['Product Dimensions'] || specs['Package Dimensions'] || specs['Dimensions'] || '';
  const dimMatch = dimStr.match(/([0-9.]+)\s*x\s*([0-9.]+)\s*x\s*([0-9.]+)/i);
  if (dimMatch) {
    defaultLength = Math.round(parseFloat(dimMatch[1])).toString();
    defaultWidth = Math.round(parseFloat(dimMatch[2])).toString();
    defaultDepth = Math.round(parseFloat(dimMatch[3])).toString();
  }

  const fallbackResult: ShippingAiResult = {
    domesticShippingType: 'Standard shipping: Small to medium items',
    majorWeight: defaultMajor,
    minorWeight: defaultMinor,
    packageLength: defaultLength,
    packageWidth: defaultWidth,
    packageDepth: defaultDepth
  };

  try {
    const apiKey = apiKeyOverride || (await getGeminiApiKey());
    if (!apiKey) return fallbackResult;

    const { systemInstruction, userPrompt } = buildShippingPrompt(product);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.2, topP: 0.95, responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) return fallbackResult;
    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return fallbackResult;

    const parsed = JSON.parse(textContent);
    return {
      domesticShippingType: parsed.domesticShippingType || fallbackResult.domesticShippingType,
      majorWeight: parsed.majorWeight ? String(parsed.majorWeight).replace(/[^0-9]/g, '') : fallbackResult.majorWeight,
      minorWeight: parsed.minorWeight ? String(parsed.minorWeight).replace(/[^0-9]/g, '') : fallbackResult.minorWeight,
      packageLength: parsed.packageLength ? String(parsed.packageLength).replace(/[^0-9]/g, '') : fallbackResult.packageLength,
      packageWidth: parsed.packageWidth ? String(parsed.packageWidth).replace(/[^0-9]/g, '') : fallbackResult.packageWidth,
      packageDepth: parsed.packageDepth ? String(parsed.packageDepth).replace(/[^0-9]/g, '') : fallbackResult.packageDepth
    };
  } catch (err) {
    console.warn('[Gemini API] Shipping AI call failed, using fallback values:', err);
    return fallbackResult;
  }
}


