import { AmazonProduct, ListingFormSchema } from '../../types';

export interface PromptPayload {
  systemInstruction: string;
  userPrompt: string;
}

/**
 * Builds system and user prompts for Gemini AI to populate eBay listing form schema fields based on Amazon product details.
 */
export function buildListingFormPrompt(
  product: AmazonProduct,
  schema: ListingFormSchema
): PromptPayload {
  const systemInstruction = `You are an expert e-commerce product manager and listing optimization AI specializing in eBay listing creation.
Your task is to analyze Amazon product data and match it against an extracted eBay listing form schema.
For every field specified in the form schema, you must determine the most accurate, high-converting, and compliant value.

STRICT RULES:
1. For dropdown or select fields ('type': 'dropdown' or 'select'):
   - If 'allowCustomValue' is true:
     - Check if any option in the 'options' list matches the product details.
     - If a matching option string exists in 'options', use that option.
     - If NO option in 'options' matches, return the appropriate custom value string derived from the product details (e.g., custom Brand name "PT Pro").
   - If 'allowCustomValue' is false:
     - You MUST pick an EXACT string match or closest match from the provided 'options' list.
2. For text fields like 'title' or 'Item title':
   - Craft a high-converting, search-optimized eBay title up to 80 characters (enforce maxLength constraint). Do not include ALL CAPS spam or forbidden characters.
3. For pricing fields ('startPrice', 'price'):
   - Use reasonable competitive pricing derived from the Amazon product price ($${product.price}).
4. Return ONLY a valid JSON object matching the requested schema.`;

  const fieldSummaries = schema.allFields.map(field => ({
    name: field.name,
    label: field.label,
    type: field.type,
    section: field.section,
    subsection: field.subsection || undefined,
    maxLength: field.maxLength || undefined,
    allowCustomValue: field.allowCustomValue || undefined,
    options: field.options && field.options.length > 0 ? field.options.slice(0, 50) : undefined,
    currentValue: field.currentValue || undefined
  }));

  const userPrompt = `Product Details (Source: Amazon):
  Title: ${product.title}
  Brand: ${product.brand}
  Price: $${product.price}
  Category Path: ${product.categoryPath ? product.categoryPath.join(' > ') : product.category}
  Availability: ${product.availability}
  Description: ${product.description}
  Features:
  ${product.features ? product.features.map(feat => '- ' + feat).join('\n') : 'N/A'}

Specifications:
${JSON.stringify(product.specifications || {}, null, 2)}

Target eBay Listing Form Schema (Fields to Populate):
${JSON.stringify(fieldSummaries, null, 2)}

Please determine optimal values for each field in the form schema and return a JSON object with this exact structure:
{
  "fieldValues": [
    {
      "name": "field_name_attribute",
      "id": "element_id_or_fallback",
      "label": "field_label",
      "value": "determined_value_string",
    }
  ]
}`;

  return { systemInstruction, userPrompt };
}
