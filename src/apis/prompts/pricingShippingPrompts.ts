import { AmazonProduct } from '../../types';

export interface PricingAiResult {
  format: 'Buy It Now' | 'Auction';
  price: string;
  startPrice?: string;
  duration?: string;
  quantity?: string;
  immediatePay?: boolean;
  bestOfferEnabled?: boolean;
}

export interface ShippingAiResult {
  domesticShippingType: string;
  majorWeight: string;
  minorWeight: string;
  packageLength: string;
  packageWidth: string;
  packageDepth: string;
}

/**
 * Builds system and user prompts for pricing decision.
 */
export function buildPricingPrompt(product: AmazonProduct) {
  const systemInstruction = `You are an expert eBay pricing specialist.
Your task is to analyze Amazon product information and determine optimal eBay pricing settings.
Rules:
1. By default, prefer "Buy It Now" format for standard retail goods unless it is clearly an antique, rare collectible, or auction-style item.
2. For "price", output a clean numeric string with 2 decimal places (e.g. "19.99") derived competitively from the Amazon price ($${product.price}).
3. For "startPrice", if format is "Auction", calculate a sensible starting bid (approx 60-75% of retail price).
4. For "duration", if "Auction", pick one of: "3 days", "5 days", "7 days", "10 days" (default "7 days").
5. For "quantity", default to "1".
6. Return ONLY a valid JSON object matching the schema.`;

  const userPrompt = `Product Details:
Title: ${product.title}
Brand: ${product.brand}
Amazon Price: $${product.price}
Category: ${product.category}
Availability: ${product.availability}

Return JSON with this exact structure:
{
  "format": "Buy It Now",
  "price": "24.99",
  "startPrice": "14.99",
  "duration": "7 days",
  "quantity": "1",
  "immediatePay": true,
  "bestOfferEnabled": false
}`;

  return { systemInstruction, userPrompt };
}

/**
 * Builds system and user prompts for shipping method, weight, and dimension estimation.
 */
export function buildShippingPrompt(product: AmazonProduct) {
  const systemInstruction = `You are an expert e-commerce logistics specialist.
Your task is to analyze Amazon product information (including specifications, dimensions, weight) and determine optimal eBay shipping configuration.
Available Shipping Methods:
- "Standard shipping: Small to medium items" (used for almost all normal retail items)
- "Freight: Large items that require special handling" (only for items over 70 lbs, pallets, large machinery/furniture)
- "No shipping. Local pickup only" (vehicles or pickup-only items)

Rules:
1. Examine product specifications for "Item Weight", "Package Weight", "Dimensions", "Package Dimensions".
2. Convert and return weight as integer "majorWeight" (pounds) and integer "minorWeight" (ounces 0-15).
3. Return dimensions as integer inches for "packageLength", "packageWidth", "packageDepth". If unknown, provide realistic estimates based on item type.
4. Return ONLY a valid JSON object.`;

  const userPrompt = `Product Details:
Title: ${product.title}
Specifications:
${JSON.stringify(product.specifications || {}, null, 2)}
Features:
${(product.features || []).join('\n')}

Return JSON with this exact structure:
{
  "domesticShippingType": "Standard shipping: Small to medium items",
  "majorWeight": "1",
  "minorWeight": "4",
  "packageLength": "10",
  "packageWidth": "7",
  "packageDepth": "4"
}`;

  return { systemInstruction, userPrompt };
}
