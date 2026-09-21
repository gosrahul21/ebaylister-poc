export async function waitForUrlAndComplete(
  tabId: number,
  urlSubstr: string,
  maxWaitMs = 20000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url && tab.url.includes(urlSubstr) && tab.status === 'complete') {
        return;
      }
    } catch {
      // Ignore tab get errors during navigation
    }
    await new Promise(r => setTimeout(r, 400));
  }
}
