import { AmazonProduct, FormFieldSchema } from '../../types';

export interface ItemSpecificsPromptPayload {
  systemInstruction: string;
  userPrompt: string;
}

/**
 * Builds system instruction and user prompt for Gemini AI to populate
 * eBay Item Specific fields dynamically extracted from the listing page.
 */
export function buildItemSpecificsPrompt(
  product: AmazonProduct,
  fields: FormFieldSchema[]
): ItemSpecificsPromptPayload {
  const systemInstruction = `You are an expert e-commerce product manager specializing in eBay listing item specifics optimization.
Your task is to analyze Amazon product data and accurately determine values for each eBay "Item Specific" field.

STRICT FIELD FILLING RULES:
1. For single-select dropdown fields ('type': 'dropdown'):
   - If 'allowCustomValue' is true:
     - Check if any predefined option in 'options' matches the product details.
     - If a matching option exists in 'options', return that exact option string.
     - If NO option in 'options' matches, return a concise, high-converting custom string derived from product specifications (e.g. custom Brand or specific feature).
   - If 'allowCustomValue' is false:
     - You MUST pick the exact string match or best fit from the provided 'options' list.

2. For multi-select fields ('type': 'multiselect'):
   - You CAN provide MULTIPLE matching values as a comma-separated string (e.g., "Compression, Immobilization") or array of strings.
   - If 'allowCustomValue' is true:
     - You can select multiple predefined options from 'options' AND include custom value terms if relevant.
   - If 'allowCustomValue' is false:
     - You MUST pick only options that exist in the provided 'options' list.

3. For text fields ('type': 'text'):
   - Provide an accurate, concise text value derived from product title, features, or specifications.

4. If product details do not provide sufficient information for an optional field, omit it or return "Not Specified" if required.

Return ONLY a valid JSON object matching the requested schema.`;

  const fieldSummaries = fields.map(field => ({
    name: field.name,
    label: field.label,
    type: field.type,
    subsection: field.subsection || undefined,
    allowCustomValue: field.allowCustomValue || false,
    options: field.options && field.options.length > 0 ? field.options.slice(0, 20) : undefined,
    currentValue: field.currentValue || undefined
  }));

  const userPrompt = `Product Data (Source: Amazon):
Title: ${product.title}
Brand: ${product.brand}
Price: ${product.price}
Category Path: ${product.categoryPath ? product.categoryPath.join(' > ') : product.category}
Availability: ${product.availability}

Description:
${product.description}

Bullet Points / Key Features:
${product.features ? product.features.map(f => '- ' + f).join('\n') : 'N/A'}

Specifications:
${JSON.stringify(product.specifications || {}, null, 2)}

Target eBay Item Specifics Fields to Populate:
${JSON.stringify(fieldSummaries, null, 2)}

Determine optimal values for each item specific field and return a JSON object with this exact structure:
{
  "fieldValues": [
    {
      "name": "attributes.Type",
      "label": "Type",
      "value": "Brace"
    },
    {
      "name": "attributes.Main Purpose",
      "label": "Main Purpose",
      "value": "Compression, Immobilization"
    }
  ]
}`;

  return { systemInstruction, userPrompt };
}
