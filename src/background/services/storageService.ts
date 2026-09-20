import { AmazonProduct, ListingFormSchema } from '../../types';
import { config } from '../../config';

export const STORAGE_KEY = 'saved_amazon_products';
export const SCHEMA_STORAGE_KEY = 'latest_ebay_form_schema';
export const GEMINI_RESPONSE_KEY = 'latest_gemini_response';
export const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const DEFAULT_MOCK_PRODUCT: AmazonProduct = {
  asin: "B0DJ1X2HWN",
  availability: "In Stock",
  brand: "PT Pro Store",
  category: "Grip Strengtheners",
  categoryPath: [
    "Sports & Outdoors",
    "Exercise & Fitness",
    "Strength Training Equipment",
    "Strength Training Devices",
    "Grip Strengtheners"
  ],
  description: "Discover the long-term solution to pain relief and muscle strengthening with the Patented PT Pro Tennis Elbow Trainer.",
  features: [
    "WEIGHTED ENDS AND FLEXIBLE CONSTRUCTION",
    "TEXTURED GRIP"
  ],
  id: "B0DJ1X2HWN_1789851385253",
  images: [
    "https://m.media-amazon.com/images/I/71E96Qg0V4L.jpg",
    "https://m.media-amazon.com/images/I/41ofhSo84JL.jpg",
    "https://m.media-amazon.com/images/I/41bv+AjMfuL.jpg",
    "https://m.media-amazon.com/images/I/41D-Z53Dd5L.jpg",
    "https://m.media-amazon.com/images/I/510MHqDFmyL.jpg"
  ],
  mainImage: "https://m.media-amazon.com/images/I/71E96Qg0V4L.jpg",
  price: "28.79",
  rating: "4.4 out of 5 stars",
  reviewCount: "(47)",
  savedAt: 1789851385253,
  specifications: {
    "Brand Name": "PT Pro",
    "Color": "Grey",
    "Item Weight": "1.3 pounds",
    "Material": "Rubber",
    "Model Number": "PT-TE001"
  },
  title: "PT Pro Tennis Elbow Trainer For Physical Therapy, Textured Grip, Elbow Pain Relief",
  url: "https://www.amazon.com/dp/B0DJ1X2HWN"
};

/** Updates extension action badge count */
export async function updateBadgeCount(): Promise<void> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    const products: AmazonProduct[] = res[STORAGE_KEY] || [];
    const count = products.length;

    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ff9900' });
  } catch {
    // Ignore badge errors
  }
}

/** Get all saved products from chrome.storage.local */
export async function getSavedProducts(): Promise<AmazonProduct[]> {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return res[STORAGE_KEY] || [];
}

/** Save a product into chrome.storage.local */
export async function saveProduct(product: AmazonProduct): Promise<AmazonProduct[]> {
  const products = await getSavedProducts();
  const updated = [product, ...products.filter(p => p.asin !== product.asin)];
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  await updateBadgeCount();
  return updated;
}

/** Delete a single saved product */
export async function deleteProduct(id: string): Promise<AmazonProduct[]> {
  const products = await getSavedProducts();
  const updated = products.filter(p => p.id !== id && p.asin !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  await updateBadgeCount();
  return updated;
}

/** Clear all saved products */
export async function clearAllProducts(): Promise<AmazonProduct[]> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  await updateBadgeCount();
  return [];
}

/** Save extracted form schema */
export async function saveFormSchema(schema: ListingFormSchema): Promise<void> {
  await chrome.storage.local.set({ [SCHEMA_STORAGE_KEY]: schema });
}

/** Get latest saved form schema */
export async function getFormSchema(): Promise<ListingFormSchema | undefined> {
  const res = await chrome.storage.local.get(SCHEMA_STORAGE_KEY);
  return res[SCHEMA_STORAGE_KEY] || undefined;
}

/** Save latest Gemini AI response payload */
export async function saveLatestGeminiResponse(payload: unknown): Promise<void> {
  await chrome.storage.local.set({ [GEMINI_RESPONSE_KEY]: payload });
}

/** Get latest saved Gemini AI response payload */
export async function getLatestGeminiResponse(): Promise<unknown> {
  const res = await chrome.storage.local.get(GEMINI_RESPONSE_KEY);
  return res[GEMINI_RESPONSE_KEY] || undefined;
}

/** Save Gemini API Key into chrome.storage.local */
export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey });
}

/** Get Gemini API Key from chrome.storage.local or config fallback */
export async function getGeminiApiKey(): Promise<string | null> {
  const res = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  if (res[API_KEY_STORAGE_KEY]) {
    return res[API_KEY_STORAGE_KEY];
  }
  return config.GEMINI_API_KEY || null;
}

