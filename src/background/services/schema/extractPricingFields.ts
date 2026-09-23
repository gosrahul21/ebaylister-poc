import { FormFieldSchema } from '../../../types';
import { buildExtractPricingSectionScript } from '../../injectors';

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
