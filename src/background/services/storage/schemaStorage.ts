import { ListingFormSchema } from '../../../types';

export const SCHEMA_STORAGE_KEY = 'latest_ebay_form_schema';

/** Save extracted form schema */
export async function saveFormSchema(schema: ListingFormSchema): Promise<void> {
  await chrome.storage.local.set({ [SCHEMA_STORAGE_KEY]: schema });
}

/** Get latest saved form schema */
export async function getFormSchema(): Promise<ListingFormSchema | undefined> {
  const res = await chrome.storage.local.get(SCHEMA_STORAGE_KEY);
  return res[SCHEMA_STORAGE_KEY] || undefined;
}
