import { AmazonProduct, FieldValueMapping, ListingFormSchema } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { fillDropdownField, fillSelectField, fillInputField } from './formFieldHandlers';

/**
 * Calls Gemini AI to generate field values and fills all matching form fields sequentially.
 */
export async function fillAiFormFields(
  debuggee: chrome.debugger.Debuggee,
  _targetProduct: AmazonProduct,
  formSchema: ListingFormSchema,
  currentPosition: Position
): Promise<Position> {
  console.log('[CDP eBay Automator] Step 4c - Calling Gemini AI to determine field values...');
  let aiFieldValues: FieldValueMapping[] = [];

  if (aiFieldValues.length === 0) {
    console.warn('[CDP eBay Automator] Step 4c - No AI field values returned. Skipping schema-driven fill.');
    return currentPosition;
  }

  const schemaFieldMap = new Map(formSchema.allFields.map(field => [field.name, field]));

  for (const fieldValue of aiFieldValues) {
    if (fieldValue.name === 'title' || fieldValue.name === 'categoryId'||  fieldValue.name === 'condition') continue;

    const schemaField = schemaFieldMap.get(fieldValue.name);
    if (!schemaField || !fieldValue.value) continue;

    // Skip Pricing, Shipping, Category, and Item Specifics sections as they are handled in dedicated workflow steps
    if (schemaField.section === 'Pricing' || schemaField.section === 'Shipping' || schemaField.section === 'Category' || schemaField.section === 'Item specifics' || schemaField.name.startsWith('attributes.')) continue;

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


export async function getProductListingFormValues(
  // product: AmazonProduct,
  // formSchema: ListingFormSchema,
): Promise<FieldValueMapping[]> {
  console.log('[CDP eBay Automator] Step 4c - Calling Gemini AI to determine field values...');
  let fieldValues: FieldValueMapping[] = [
    {
      "name": "title",
      "id": "title",
      "label": "Item title",
      "value": "ENLUNTRA Tennis Elbow Brace for Tendonitis Golfer's Adjustable Strap Black"
    },
    {
      "name": "categoryId",
      "id": "categoryId",
      "label": "Item category",
      "value": "Orthotics, Braces & Sleeves (in Health & Beauty > Medical & Mobility > Orthopedics & Supports)"
    },
    {
      "name": "attributes.Type",
      "id": "attributes.Type",
      "label": "Type",
      "value": "Brace"
    },
    {
      "name": "attributes.Brand",
      "id": "attributes.Brand",
      "label": "Brand",
      "value": "ENLUNTRA"
    },
    {
      "name": "attributes.Main Purpose",
      "id": "attributes.Main Purpose",
      "label": "Main Purpose",
      "value": "Tendonitis"
    },
    {
      "name": "attributes.Size",
      "id": "attributes.Size",
      "label": "Size",
      "value": "One Size"
    },
    {
      "name": "attributes.Material",
      "id": "attributes.Material",
      "label": "Material",
      "value": "Not Specified"
    },
    {
      "name": "attributes.Color",
      "id": "attributes.Color",
      "label": "Color",
      "value": "Black"
    },
    {
      "name": "attributes.Body Area",
      "id": "attributes.Body Area",
      "label": "Body Area",
      "value": "Arm"
    },
    {
      "name": "attributes.Features",
      "id": "attributes.Features",
      "label": "Features",
      "value": "Adjustable"
    },
    {
      "name": "attributes.Department",
      "id": "attributes.Department",
      "label": "Department",
      "value": "Unisex"
    },
    {
      "name": "attributes.Labels & Certifications",
      "id": "attributes.Labels & Certifications",
      "label": "Labels & Certifications",
      "value": "Not Specified"
    },
    {
      "name": "condition",
      "id": "condition",
      "label": "Item condition",
      "value": "New"
    },
    {
      "name": "format",
      "id": "format",
      "label": "Format",
      "value": "Auction"
    },
    {
      "name": "domesticShippingType",
      "id": "domesticShippingType",
      "label": "Shipping method",
      "value": "Standard shipping: Small to medium items"
    },
    {
      "name": "photoUploadMobilePref",
      "id": "photoUploadMobilePref",
      "label": "Upload photos from mobile",
      "value": "on"
    },
    {
      "name": "photoUploadWebPref",
      "id": "photoUploadWebPref",
      "label": "Upload photos from web",
      "value": "on"
    },
    {
      "name": "galleryPlusPref",
      "id": "galleryPlusPref",
      "label": "Gallery Plus",
      "value": "on"
    },
    {
      "name": "boldTitlePref",
      "id": "boldTitlePref",
      "label": "Bold title",
      "value": "on"
    },
    {
      "name": "subtitlePref",
      "id": "subtitlePref",
      "label": "Subtitle",
      "value": "on"
    },
    {
      "name": "customLabelPref",
      "id": "customLabelPref",
      "label": "Custom label (SKU)",
      "value": "on"
    },
    {
      "name": "description",
      "id": "description",
      "label": "description",
      "value": "ENLUNTRA Tennis Elbow Brace for Men & Women. Designed for targeted pain relief from Tendonitis, Tennis Elbow, Golfer's Elbow, Arthritis, Bursitis, and Epicondylitis. Features an innovative knob-based system for easy and precise compression adjustment, ensuring optimal support and secure fit. Made from high-quality, skin-friendly, and breathable materials for long-lasting comfort and unrestricted arm movement. Fits elbows 9 to 13 inches (23–33 cm). Ideal for athletes, individuals with repetitive motions, and those seeking relief from extensive computer use. Color: Black. One Size Regular."
    },
    {
      "name": "Toggle General",
      "id": "Toggle General",
      "label": "Toggle General",
      "value": "on"
    }
  ]

  try {
    // fieldValues = await generateListingFormValues(product, formSchema);
    console.log(`[CDP eBay Automator] Step 4c - Gemini returned ${fieldValues.length} field value(s).`);
  } catch (aiErr) {
    console.error('[CDP eBay Automator] Step 4c - Gemini AI call failed:', aiErr);
  }
  return fieldValues;
}