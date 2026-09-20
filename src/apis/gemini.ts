import { AmazonProduct, FieldValueMapping, ListingFormSchema } from '../types';
import { buildListingFormPrompt } from './prompts/listingFormPrompt';
import {
  saveLatestGeminiResponse,
  getGeminiApiKey,
  saveGeminiApiKey
} from '../background/services/storageService';

export { getGeminiApiKey, saveGeminiApiKey };

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

