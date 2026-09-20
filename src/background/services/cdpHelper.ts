import { moveCursorToTargetElement } from '../helper/moveCursorToTargetElement';



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

export async function injectVisualCursor(debuggee: chrome.debugger.Debuggee): Promise<void> {
  try {
    await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function() {
          if (document.getElementById('cdp-mimic-virtual-cursor')) return;
          const cursor = document.createElement('div');
          cursor.id = 'cdp-mimic-virtual-cursor';
          cursor.style.cssText = 'position:fixed;top:0;left:0;width:24px;height:24px;pointer-events:none;z-index:2147483647;transform:translate3d(-100px,-100px,0);transition:transform 0.02s linear, opacity 0.3s ease;opacity:0;';
          cursor.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 8px rgba(229,57,53,0.85));"><path d="M3 3L10.07 19.97L13.58 13.58L19.97 10.07L3 3Z" fill="#e53935" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
          document.body.appendChild(cursor);

          let hideTimer;
          window.addEventListener('mousemove', function(e) {
            cursor.style.transform = 'translate3d(' + e.clientX + 'px, ' + e.clientY + 'px, 0)';
            cursor.style.opacity = '1';
            clearTimeout(hideTimer);
            hideTimer = setTimeout(function() { cursor.style.opacity = '0'; }, 2000);
          }, { passive: true, capture: true });
        })();
      `
    });
  } catch {
    // Non-critical
  }
}

export async function dispatchMouseMove(debuggee: chrome.debugger.Debuggee, x: number, y: number): Promise<unknown> {
  return chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x, y,
    button: 'none',
    clickCount: 0,
    modifiers: 0
  });
}

export async function dispatchClick(debuggee: chrome.debugger.Debuggee, x: number, y: number): Promise<void> {
  await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1, modifiers: 0
  });
  await new Promise(r => setTimeout(r, 65 + Math.floor(Math.random() * 60)));
  await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', clickCount: 1, modifiers: 0
  });
}

/**
 * Types text into the focused element using CDP Input methods (Input.dispatchKeyEvent / Input.insertText)
 * to simulate authentic human keyboard entry and properly trigger React/eBay state events.
 */
export async function cdpTypeHuman(
  debuggee: chrome.debugger.Debuggee,
  text: string,
  selectorOrIndex?: string | number
): Promise<void> {
  // 1. Focus the target element in DOM and clear any previous content
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
      (function() {
        let el = null;
        const arg = ${JSON.stringify(selectorOrIndex ?? null)};
        if (typeof arg === 'string' && arg) {
          el = document.querySelector(arg);
        } else if (typeof arg === 'number') {
          // 1. Find by exact ID string pattern: s0-...@PHOTOS...[arg]-se-textbox
          const allInputs = Array.from(document.querySelectorAll('input'));
          el = allInputs.find(inp => inp.id && (inp.id.includes('[' + arg + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + arg + ']'))));
          
          // 2. Try .url-row container
          if (!el) {
            const urlRows = Array.from(document.querySelectorAll('.url-row'));
            if (urlRows[arg]) el = urlRows[arg].querySelector('input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, input');
          }
          
          // 3. Try all photo textbox control inputs on page/modal
          if (!el) {
            const allTextboxInputs = Array.from(document.querySelectorAll('.url-row input, input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, .se-textbox--container input, span.se-textbox input, input[type="text"]'));
            const visible = allTextboxInputs.filter(inp => {
              const style = window.getComputedStyle(inp);
              const rect = inp.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
            });
            el = visible[arg] || allTextboxInputs[arg] || allTextboxInputs[allTextboxInputs.length - 1];
          }
        }
        if (!el) el = document.activeElement;

        if (el && el !== document.body) {
          el.focus();
          if ('value' in el) {
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      })()
    `
  });

  await new Promise(r => setTimeout(r, 60));

  // 2. Insert text via CDP Input.insertText (triggers native browser key & IME input events)
  await chrome.debugger.sendCommand(debuggee, 'Input.insertText', {
    text: text
  });

  // 3. Fallback & Event Triggering: Ensure value is set and all framework listeners (input, change, blur) fire
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
      (function() {
        let el = null;
        const arg = ${JSON.stringify(selectorOrIndex ?? null)};
        if (typeof arg === 'string' && arg) {
          el = document.querySelector(arg);
        } else if (typeof arg === 'number') {
          const allInputs = Array.from(document.querySelectorAll('input'));
          el = allInputs.find(inp => inp.id && (inp.id.includes('[' + arg + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + arg + ']'))));
          if (!el) {
            const urlRows = Array.from(document.querySelectorAll('.url-row'));
            if (urlRows[arg]) el = urlRows[arg].querySelector('input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, input');
          }
          if (!el) {
            const allTextboxInputs = Array.from(document.querySelectorAll('.url-row input, input.textbox__control, input[class*="textbox__control"], .se-textbox--input input, .se-textbox--container input, span.se-textbox input, input[type="text"]'));
            const visible = allTextboxInputs.filter(inp => {
              const style = window.getComputedStyle(inp);
              const rect = inp.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
            });
            el = visible[arg] || allTextboxInputs[arg] || allTextboxInputs[allTextboxInputs.length - 1];
          }
        }
        if (!el) el = document.activeElement;

        if (el && 'value' in el) {
          if (!el.value || el.value !== ${JSON.stringify(text)}) {
            el.value = ${JSON.stringify(text)};
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()
    `
  });
}

export interface Point {

  x: number;
  y: number;
}

export type InputTarget = string | number | Point;

/**
 * Reusable function that locates a target element (via CSS selector, index, or coordinates),
 * smooth-scrolls if needed, moves mouse using Bezier path simulation from current position,
 * clicks the element, and types text using CDP Input methods with full framework event dispatching.
 *
 * @param debuggee - The active chrome.debugger target tab.
 * @param target - Selector string (e.g. 'input[name="title"]'), index (number), or coordinates {x, y}.
 * @param text - The text value to input into the target element.
 * @param currentPos - Current mouse position {x, y} to initiate Bezier path from (default {x: 100, y: 100}).
 * @returns Object with found status, final target coordinates {x, y}, and optional error message.
 */
export async function cdpHumanInput(
  debuggee: chrome.debugger.Debuggee,
  target: InputTarget,
  text: string,
  currentPos: Point = { x: 100, y: 100 }
): Promise<{ found: boolean; x: number; y: number; error?: string }> {
  let targetX: number | undefined;
  let targetY: number | undefined;

  if (typeof target === 'object' && target !== null && 'x' in target && 'y' in target) {
    targetX = target.x;
    targetY = target.y;
  } else if (typeof target === 'string') {
    const coords = await smoothScrollToElement(debuggee, target);
    if (!coords.found || coords.x === undefined || coords.y === undefined) {
      return { found: false, x: currentPos.x, y: currentPos.y, error: coords.error || `Element "${target}" not found` };
    }
    targetX = coords.x;
    targetY = coords.y;
  } else if (typeof target === 'number') {
    const evalResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function() {
          const idx = ${target};
          const allInputs = Array.from(document.querySelectorAll('input'));
          let el = allInputs.find(inp => inp.id && (inp.id.includes('[' + idx + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))));
          if (!el) {
            const urlRows = Array.from(document.querySelectorAll('.url-row'));
            if (urlRows[idx]) el = urlRows[idx].querySelector('input.textbox__control, input');
          }
          if (!el) {
            const modal = document.querySelector('[role="dialog"], .lightbox-dialog, .modal') || document.body;
            const visible = Array.from(modal.querySelectorAll('.url-row input, input.textbox__control, input[type="text"], input:not([type]), input')).filter(inp => {
              const style = window.getComputedStyle(inp);
              const rect = inp.getBoundingClientRect();
              return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
            });
            el = visible[idx] || visible[visible.length - 1];
          }
          if (!el) return JSON.stringify({ found: false });
          el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
          const rect = el.getBoundingClientRect();
          return JSON.stringify({
            found: true,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          });
        })()
      `,
      returnByValue: true
    }) as { result?: { value?: string } };

    const info = evalResult.result?.value ? JSON.parse(evalResult.result.value) : { found: false };
    if (!info.found || info.x === undefined || info.y === undefined) {
      return { found: false, x: currentPos.x, y: currentPos.y, error: `Input index ${target} not found` };
    }
    targetX = info.x;
    targetY = info.y;
  }

  if (targetX === undefined || targetY === undefined) {
    return { found: false, x: currentPos.x, y: currentPos.y, error: 'Invalid target coordinates' };
  }

  // Bezier curve mouse movement
  await moveCursorToTargetElement(currentPos, { x: targetX, y: targetY }, debuggee);

  // Click target element
  await dispatchClick(debuggee, targetX, targetY);

  // Perform CDP human typing
  await cdpTypeHuman(debuggee, text, typeof target !== 'object' ? target : undefined);

  return { found: true, x: targetX, y: targetY };
}


export async function getElementCoords(

  debuggee: chrome.debugger.Debuggee,
  selector: string
): Promise<{ found: boolean; x?: number; y?: number; error?: string }> {
  try {
    const evalResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function() {
          const sel = ${JSON.stringify(selector)};
          const selectors = sel.split(',').map(s => s.trim());
          let el = null;
          for (const s of selectors) {
            if (s === 'radio:first') {
              const modal = document.querySelector('[role="dialog"], .modal, .lightbox-dialog') || document.body;
              el = modal.querySelector('input[type="radio"], [role="radio"], label.radio-label, label') || modal.querySelector('label');
            } else if (s.startsWith('text:')) {
              const searchText = s.slice(5).trim().toLowerCase();
              const allElements = Array.from(document.querySelectorAll('button, a, [role="button"], label, input, span'));
              el = allElements.find(b => {
                const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                return txt.includes(searchText);
              });
            } else {
              el = document.querySelector(s);
            }
            if (el) break;
          }

          if (!el) return JSON.stringify({ found: false, error: 'No element matches "' + sel + '"' });

          el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            return JSON.stringify({ found: false, error: 'Element is hidden' });
          }

          const padW = rect.width * 0.2;
          const padH = rect.height * 0.2;
          const randX = rect.left + padW + Math.random() * Math.max(1, rect.width - 2 * padW);
          const randY = rect.top + padH + Math.random() * Math.max(1, rect.height - 2 * padH);

          return JSON.stringify({
            found: true,
            x: Math.round(randX),
            y: Math.round(randY)
          });
        })()
      `,
      returnByValue: true
    }) as { result?: { value?: string }; exceptionDetails?: { text?: string } };

    if (evalResult.exceptionDetails) {
      return { found: false, error: evalResult.exceptionDetails.text || 'DOM evaluation failed' };
    }

    const val = typeof evalResult.result?.value === 'string'
      ? JSON.parse(evalResult.result.value)
      : evalResult.result?.value;

    return val ?? { found: false, error: 'Empty evaluation result' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { found: false, error: msg };
  }
}

export async function waitForElementCoords(
  debuggee: chrome.debugger.Debuggee,
  selector: string,
  maxRetries = 25,
  intervalMs = 400
): Promise<{ found: boolean; x?: number; y?: number; error?: string }> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await getElementCoords(debuggee, selector);
    if (res.found) return res;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return { found: false, error: `Element matching "${selector}" not found after retries` };
}

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

export async function clickOutsideModal(debuggee: chrome.debugger.Debuggee, startX: number, startY: number): Promise<{ x: number, y: number }> {
  try {
    const coordsRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function() {
          const modal = document.querySelector('[role="dialog"], .lightbox-dialog, .modal');
          if (!modal) return JSON.stringify({ found: false });
          const rect = modal.getBoundingClientRect();
          // Find a point safely outside the modal (top left corner)
          const targetX = Math.max(10, rect.left - 50);
          const targetY = Math.max(10, rect.top - 50);
          return JSON.stringify({ found: true, x: targetX, y: targetY });
        })()
      `,
      returnByValue: true
    }) as { result?: { value?: string } };

    const info = coordsRes.result?.value ? JSON.parse(coordsRes.result.value) : { found: false };
    if (info.found) {
      console.log(`[CDP Helper] Clicking outside modal at (${info.x}, ${info.y})`);
      await moveCursorToTargetElement({ x: startX, y: startY }, { x: info.x, y: info.y }, debuggee);
      await dispatchClick(debuggee, info.x, info.y);
      return { x: info.x, y: info.y };
    }

  } catch (err) {
    console.warn('[CDP Helper] Failed to click outside modal:', err);
  }
  return { x: startX, y: startY };
}

export async function smoothScrollToElement(
  debuggee: chrome.debugger.Debuggee,
  selector: string
): Promise<{ found: boolean; x?: number; y?: number; error?: string }> {
  const initialRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: `
      (function() {
        const sel = ${JSON.stringify(selector)};
        const selectors = sel.split(',').map(s => s.trim());
        let el = null;
        for (const s of selectors) {
          if (s === 'radio:first') {
            const modal = document.querySelector('[role="dialog"], .modal, .lightbox-dialog') || document.body;
            el = modal.querySelector('input[type="radio"], [role="radio"], label.radio-label, label') || modal.querySelector('label');
          } else if (s.startsWith('text:')) {
            const searchText = s.slice(5).trim().toLowerCase();
            const allElements = Array.from(document.querySelectorAll('button, a, [role="button"], label, input, span, h2, h3'));
            el = allElements.find(b => {
              const txt = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
              return txt.includes(searchText);
            });
          } else {
            el = document.querySelector(s);
          }
          if (el) break;
        }
        if (!el) return JSON.stringify({ found: false });
        const rect = el.getBoundingClientRect();
        return JSON.stringify({
          found: true,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth
        });
      })()
    `,
    returnByValue: true
  }) as { result?: { value?: string } };

  if (!initialRes.result?.value) return getElementCoords(debuggee, selector);
  const info = typeof initialRes.result.value === 'string' ? JSON.parse(initialRes.result.value) : initialRes.result.value;
  if (!info.found) return getElementCoords(debuggee, selector);

  const targetY = info.viewportHeight / 3;
  const totalDeltaY = info.top - targetY;

  if (Math.abs(totalDeltaY) > 60) {
    const steps = Math.min(25, Math.max(8, Math.floor(Math.abs(totalDeltaY) / 30)));
    const scrollPointX = Math.floor(info.viewportWidth / 2);
    const scrollPointY = Math.floor(info.viewportHeight / 2);

    for (let i = 0; i < steps; i++) {
      const progress = (i + 1) / steps;
      const easeFactor = 0.5 * (1 - Math.cos(Math.PI * progress));
      const prevProgress = i / steps;
      const prevEase = 0.5 * (1 - Math.cos(Math.PI * prevProgress));

      const stepDeltaY = Math.round((easeFactor - prevEase) * totalDeltaY);

      await chrome.debugger.sendCommand(debuggee, 'Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: scrollPointX,
        y: scrollPointY,
        deltaX: 0,
        deltaY: stepDeltaY
      });
      await new Promise(r => setTimeout(r, 16 + Math.floor(Math.random() * 15)));
    }

    await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 200)));
  }

  return getElementCoords(debuggee, selector);
}
