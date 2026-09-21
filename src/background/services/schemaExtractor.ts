import { ListingFormSchema, FormFieldSchema } from '../../types';
import { saveFormSchema } from './storageService';
import {
  buildExtractEbayFormSchemaScript,
  buildExtractPricingSectionScript,
  buildExtractShippingSectionScript
} from '../injectors';

/**
 * Dynamically extracts full form schema from eBay listing page (/lstng?draftId=...)
 * including all section titles, field labels, input names, element IDs, field types, options, and CSS selectors.
 */
export async function extractFormSchema(debuggee: chrome.debugger.Debuggee): Promise<ListingFormSchema | null> {
  console.log('[Schema Extractor] Extracting form schema from listing page...');
  try {
    const res = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildExtractEbayFormSchemaScript(),
      returnByValue: true
    }) as { result?: { value?: string } };

    if (!res.result?.value) return null;
    const schemaData: ListingFormSchema = JSON.parse(res.result.value);

    // Save extracted schema into chrome.storage.local via storageService
    await saveFormSchema(schemaData);
    console.log(JSON.stringify(schemaData, null, 2));

    return schemaData;
  } catch (err) {
    console.error('[Schema Extractor] Failed to extract form schema:', err);
    return null;
  }
}

/**
 * Re-extracts only the pricing section subfields currently present in the DOM.
 * Call this after changing the format master dropdown.
 */
export async function extractPricingFields(debuggee: chrome.debugger.Debuggee): Promise<FormFieldSchema[]> {
  console.log('[Schema Extractor] Re-extracting Pricing sub-fields from DOM...');
  try {
    const res = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildExtractPricingSectionScript(),
      returnByValue: true
    }) as { result?: { value?: string } };

    if (!res.result?.value) return [];
    const fields: FormFieldSchema[] = JSON.parse(res.result.value);
    console.log(`[Schema Extractor] Extracted ${fields.length} Pricing fields:`, fields.map(f => f.name));
    return fields;
  } catch (err) {
    console.error('[Schema Extractor] Failed to re-extract pricing fields:', err);
    return [];
  }
}

/**
 * Re-extracts only the shipping section subfields currently present in the DOM.
 * Call this after changing the shipping method master dropdown.
 */
export async function extractShippingFields(debuggee: chrome.debugger.Debuggee): Promise<FormFieldSchema[]> {
  console.log('[Schema Extractor] Re-extracting Shipping sub-fields from DOM...');
  try {
    const res = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildExtractShippingSectionScript(),
      returnByValue: true
    }) as { result?: { value?: string } };

    if (!res.result?.value) return [];
    const fields: FormFieldSchema[] = JSON.parse(res.result.value);
    console.log(`[Schema Extractor] Extracted ${fields.length} Shipping fields:`, fields.map(f => f.name));
    return fields;
  } catch (err) {
    console.error('[Schema Extractor] Failed to re-extract shipping fields:', err);
    return [];
  }
}
