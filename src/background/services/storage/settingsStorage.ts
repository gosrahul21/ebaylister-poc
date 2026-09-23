import { GlobalListingSettings } from '../../../types';

export const SETTINGS_STORAGE_KEY = 'global_listing_settings';

export const DEFAULT_GLOBAL_SETTINGS: GlobalListingSettings = {
  markupPercentage: 15,
  format: 'Buy It Now',
  auctionBidPercentage: 70,
  auctionDuration: '7 days',
  immediatePay: true,
  allowOffers: false
};

/** Get Global Listing Settings from chrome.storage.local */
export async function getGlobalSettings(): Promise<GlobalListingSettings> {
  try {
    const res = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    return { ...DEFAULT_GLOBAL_SETTINGS, ...(res[SETTINGS_STORAGE_KEY] || {}) };
  } catch {
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

/** Save Global Listing Settings into chrome.storage.local */
export async function saveGlobalSettings(settings: Partial<GlobalListingSettings>): Promise<GlobalListingSettings> {
  const current = await getGlobalSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: updated });
  return updated;
}
