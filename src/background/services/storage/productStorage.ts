import { AmazonProduct } from '../../../types';

export const STORAGE_KEY = 'saved_amazon_products';

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
