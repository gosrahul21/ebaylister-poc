import { config } from '../../../config';

export const GEMINI_RESPONSE_KEY = 'latest_gemini_response';
export const API_KEY_STORAGE_KEY = 'gemini_api_key';

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

export async function getGeminiApiKey(): Promise<string | null> {
  return (config as { GEMINI_API_KEY?: string }).GEMINI_API_KEY || null;
}
