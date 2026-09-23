import { FormFieldSchema } from '../../../types';
import { buildExtractShippingSectionScript } from '../../injectors';

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
