export interface AmazonProduct {
  id: string; // Unique ID (ASIN + timestamp or ASIN)
  asin: string;
  title: string;
  price: string;
  brand: string;
  rating: string;
  reviewCount: string;
  mainImage: string;
  images: string[]; // All product image URLs on the screen
  url: string;
  availability: string;
  features: string[];
  description: string;
  specifications: Record<string, string>;
  category: string;
  categoryPath: string[]; // e.g. ["Sports & Outdoors", "Hunting & Fishing", "Fishing", "Accessories", "Fishing Hats"]
  savedAt: number;
}

export interface GlobalListingSettings {
  markupPercentage: number; // e.g. 15 for 15%
  format: 'Buy It Now' | 'Auction';
  auctionBidPercentage: number; // e.g. 70 for 70% of item price
  auctionDuration: string; // '3 days' | '5 days' | '7 days' | '10 days'
  immediatePay: boolean;
  allowOffers: boolean;
}

export interface FormFieldSchema {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'dropdown' | 'multiselect' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'rich-text' | 'pill';
  section: string;
  subsection?: string;
  required: boolean;
  currentValue: string;
  placeholder?: string;
  maxLength?: number;
  options?: string[];
  allowCustomValue?: boolean;
  selector: string;
}

export interface ListingFormSchema {
  url: string;
  extractedAt: number;
  totalFieldsCount: number;
  allFields: FormFieldSchema[];
}

export interface FieldValueMapping {
  name: string;
  id?: string;
  label?: string;
  value: string;
  rationale?: string;
}

export enum ExtensionAction {
  SCRAPE_AMAZON_PRODUCT = 'SCRAPE_AMAZON_PRODUCT',
  SAVE_AMAZON_PRODUCT = 'SAVE_AMAZON_PRODUCT',
  GET_SAVED_PRODUCTS = 'GET_SAVED_PRODUCTS',
  DELETE_SAVED_PRODUCT = 'DELETE_SAVED_PRODUCT',
  CLEAR_ALL_SAVED_PRODUCTS = 'CLEAR_ALL_SAVED_PRODUCTS',
  AUTOMATE_EBAY_LISTING = 'AUTOMATE_EBAY_LISTING',
  GET_FORM_SCHEMA = 'GET_FORM_SCHEMA',
  SAVE_GEMINI_API_KEY = 'SAVE_GEMINI_API_KEY',
  GET_GEMINI_API_KEY = 'GET_GEMINI_API_KEY',
  SAVE_GLOBAL_SETTINGS = 'SAVE_GLOBAL_SETTINGS',
  GET_GLOBAL_SETTINGS = 'GET_GLOBAL_SETTINGS'
}

export type ExtensionRequest =
  | { action: ExtensionAction.SCRAPE_AMAZON_PRODUCT }
  | { action: ExtensionAction.SAVE_AMAZON_PRODUCT; product: AmazonProduct }
  | { action: ExtensionAction.GET_SAVED_PRODUCTS }
  | { action: ExtensionAction.DELETE_SAVED_PRODUCT; id: string }
  | { action: ExtensionAction.CLEAR_ALL_SAVED_PRODUCTS }
  | { action: ExtensionAction.AUTOMATE_EBAY_LISTING; categoryQuery: string | string[]; product?: AmazonProduct }
  | { action: ExtensionAction.GET_FORM_SCHEMA }
  | { action: ExtensionAction.SAVE_GEMINI_API_KEY; apiKey: string }
  | { action: ExtensionAction.GET_GEMINI_API_KEY }
  | { action: ExtensionAction.SAVE_GLOBAL_SETTINGS; settings: Partial<GlobalListingSettings> }
  | { action: ExtensionAction.GET_GLOBAL_SETTINGS };

export type ExtensionResponse =
  | { success: true; product?: AmazonProduct; products?: AmazonProduct[]; schema?: ListingFormSchema; apiKey?: string; settings?: GlobalListingSettings }
  | { success: false; error: string };


