import { AmazonProduct, FieldValueMapping, ListingFormSchema } from '../../../types';
import { generateListingFormValues } from '../../../apis/gemini';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { fillDropdownField, fillSelectField, fillInputField } from './formFieldHandlers';

/**
 * Calls Gemini AI to generate field values and fills all matching form fields sequentially.
 */
export async function fillAiFormFields(
  debuggee: chrome.debugger.Debuggee,
  targetProduct: AmazonProduct,
  formSchema: ListingFormSchema,
  currentPosition: Position
): Promise<Position> {
  console.log('[CDP eBay Automator] Step 4c - Calling Gemini AI to determine field values...');
  let aiFieldValues: FieldValueMapping[] = [];
  try {
    aiFieldValues = await generateListingFormValues(targetProduct, formSchema);
    console.log(`[CDP eBay Automator] Step 4c - Gemini returned ${aiFieldValues.length} field value(s).`);
  } catch (aiErr) {
    console.error('[CDP eBay Automator] Step 4c - Gemini AI call failed:', aiErr);
  }

  if (aiFieldValues.length === 0) {
    console.warn('[CDP eBay Automator] Step 4c - No AI field values returned. Skipping schema-driven fill.');
    return currentPosition;
  }

  const schemaFieldMap = new Map(formSchema.allFields.map(f => [f.name, f]));

  for (const fieldValue of aiFieldValues) {
    if (fieldValue.name === 'title' || fieldValue.name === 'categoryId'||  fieldValue.name === 'condition') continue;

    const schemaField = schemaFieldMap.get(fieldValue.name);
    if (!schemaField || !fieldValue.value) continue;

    // Skip Pricing and Shipping sections as they are handled dynamically with their own steps
    if (schemaField.section === 'Pricing' || schemaField.section === 'Shipping' || schemaField.section === 'Category') continue;

    const value = fieldValue.value.trim();
    console.log(`[CDP eBay Automator] Step 4c - Filling field "${fieldValue.name}" (${schemaField.type}) with value: "${value}"`);

    try {
      if (schemaField.type === 'dropdown') {
        currentPosition = await fillDropdownField(debuggee, schemaField, value, currentPosition);
      } else if (schemaField.type === 'select') {
        await fillSelectField(debuggee, schemaField, value);
      } else {
        currentPosition = await fillInputField(debuggee, schemaField, value, currentPosition);
      }
    } catch (fieldErr) {
      console.error(`[CDP eBay Automator] Step 4c - Error filling field "${fieldValue.name}":`, fieldErr);
    }
  }

  console.log('[CDP eBay Automator] Step 4c - AI-driven form fill complete!');
  return currentPosition;
}
