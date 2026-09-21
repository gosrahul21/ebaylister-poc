export async function ensureDebuggerAttached(debuggee: chrome.debugger.Debuggee): Promise<void> {
  try {
    await chrome.debugger.attach(debuggee, '1.3');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('Already attached')) {
      console.warn('[CDP Helper] Re-attaching debugger warning:', msg);
    }
  }
}
