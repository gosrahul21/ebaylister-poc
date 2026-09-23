import { ListingFormSchema } from '../../../types';
import { saveFormSchema } from '../storageService';
import { buildExtractEbayFormSchemaScript } from '../../injectors';

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
