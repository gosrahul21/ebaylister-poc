import { AmazonProduct, FieldValueMapping } from '../../types';
import { generateListingFormValues } from '../../apis/gemini';
import { DEFAULT_MOCK_PRODUCT } from './storageService';
import { extractFormSchema } from './schemaExtractor';
import { uploadProductImages } from './productListingWorkflow/imageUpload';
import { moveCursorToTargetElement, Position } from '@/background/helper/moveCursorToTargetElement';
import {
  ensureDebuggerAttached,
  injectVisualCursor,
  dispatchClick,
  cdpHumanInput,
  waitForElementCoords,
  waitForUrlAndComplete,
  smoothScrollToElement
} from './cdpHelper';


/**
 * Automates opening eBay prelist suggest page and simulating CDP human mouse click on Search button,
 * followed by clicking "Continue without match" on the identify step, condition selection, and filling the main form.
 */
export async function automateEbayListing(categoryQuery: string | string[], product?: AmazonProduct): Promise<void> {
  const cleanCategories = Array.isArray(categoryQuery)
    ? categoryQuery.map(c => (c || '').trim()).filter(Boolean)
    : [];
  
  const queryText = cleanCategories.length > 0
    ? cleanCategories[cleanCategories.length - 1]
    : (typeof categoryQuery === 'string' ? categoryQuery.trim() : '');

  const ebayUrl = `https://www.ebay.com/sl/prelist/suggest?title=${encodeURIComponent(queryText)}`;
  const tab = await chrome.tabs.create({ url: ebayUrl, active: true });
  if (!tab.id) return;

  const tabId = tab.id;

  const runAutomation = async () => {
    // Brief pause to allow eBay scripts to initialize DOM
    await new Promise(r => setTimeout(r, 1200));

    const debuggee = { tabId };
    try {
      console.log(`[CDP eBay Automator] Attaching debugger to eBay tab ${tabId}...`);
      await chrome.debugger.attach(debuggee, '1.3');
      await injectVisualCursor(debuggee);

      let currentPos: Position = {
        x: Math.floor(Math.random() * 200) + 50,
        y: Math.floor(Math.random() * 100) + 40
      };

      // ── STEP 1: Click Search Button ──────────────────────────────────────────
      const searchSelector = 'button.keyword-suggestion__button, button[aria-label="Search"], button.btn--primary, button[type="button"].btn--primary';
      const searchCoords = await smoothScrollToElement(debuggee, searchSelector);

      if (searchCoords.found && searchCoords.x !== undefined && searchCoords.y !== undefined) {
        console.log(`[CDP eBay Automator] Step 1 - Found search button at (${searchCoords.x}, ${searchCoords.y})`);

        const targetPos: Position = { x: searchCoords.x, y: searchCoords.y };
        await moveCursorToTargetElement(currentPos, targetPos, debuggee);

        console.log('[CDP eBay Automator] Step 1 - Clicking search button...');
        await dispatchClick(debuggee, targetPos.x, targetPos.y);
        currentPos = targetPos;

        // ── STEP 2: Click "Continue without match" Button ──────────────────────
        console.log('[CDP eBay Automator] Step 2 - Waiting for page navigation to identify step...');
        await waitForUrlAndComplete(tabId, 'identify', 15000);
        await new Promise(r => setTimeout(r, 1200));
        await ensureDebuggerAttached(debuggee);
        await injectVisualCursor(debuggee);

        const continueSelector = 'button.prelist-radix__next-action, text:Continue without match, button[class*="prelist-radix__next-action"]';
        const continueCoords = await smoothScrollToElement(debuggee, continueSelector);

        if (continueCoords.found && continueCoords.x !== undefined && continueCoords.y !== undefined) {
          console.log(`[CDP eBay Automator] Step 2 - Found "Continue without match" button at (${continueCoords.x}, ${continueCoords.y})`);

          await new Promise(r => setTimeout(r, 500 + Math.floor(Math.random() * 300)));

          const contTargetPos: Position = { x: continueCoords.x, y: continueCoords.y };
          await moveCursorToTargetElement(currentPos, contTargetPos, debuggee);

          console.log('[CDP eBay Automator] Step 2 - Clicking "Continue without match" button...');
          await dispatchClick(debuggee, contTargetPos.x, contTargetPos.y);
          currentPos = contTargetPos;

          // ── STEP 3: Handle "Confirm details" Modal Popup ───────────────────────
          console.log('[CDP eBay Automator] Step 3 - Waiting for "Confirm details" condition modal...');
          await new Promise(r => setTimeout(r, 1500));
          await injectVisualCursor(debuggee);

          // 3a. Click 1st condition radio option ("New")
          const conditionSelector = 'radio:first, text:New, input[type="radio"]';
          const conditionCoords = await waitForElementCoords(debuggee, conditionSelector, 25, 400);

          if (conditionCoords.found && conditionCoords.x !== undefined && conditionCoords.y !== undefined) {
            console.log(`[CDP eBay Automator] Step 3a - Found 1st condition option ("New") at (${conditionCoords.x}, ${conditionCoords.y})`);

            await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 300)));

            const condTargetPos: Position = { x: conditionCoords.x, y: conditionCoords.y };
            await moveCursorToTargetElement(currentPos, condTargetPos, debuggee);

            console.log('[CDP eBay Automator] Step 3a - Clicking 1st condition option...');
            await dispatchClick(debuggee, condTargetPos.x, condTargetPos.y);
            currentPos = condTargetPos;

            // 3b. Click "Continue to listing" submit button
            console.log('[CDP eBay Automator] Step 3b - Waiting for "Continue to listing" button...');
            await new Promise(r => setTimeout(r, 600));

            const listingBtnSelector = 'text:Continue to listing, button.btn--primary, text:continue to listing';
            const listingBtnCoords = await waitForElementCoords(debuggee, listingBtnSelector, 20, 400);

            if (listingBtnCoords.found && listingBtnCoords.x !== undefined && listingBtnCoords.y !== undefined) {
              console.log(`[CDP eBay Automator] Step 3b - Found "Continue to listing" button at (${listingBtnCoords.x}, ${listingBtnCoords.y})`);

              await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 300)));

              const listBtnPos: Position = { x: listingBtnCoords.x, y: listingBtnCoords.y };
              await moveCursorToTargetElement(currentPos, listBtnPos, debuggee);

              console.log('[CDP eBay Automator] Step 3b - Clicking "Continue to listing" button...');
              await dispatchClick(debuggee, listBtnPos.x, listBtnPos.y);
              currentPos = listBtnPos;

              // ── STEP 4: Fill Main Form (/lstng?draftId=...) ──────────────────
              console.log('[CDP eBay Automator] Step 4 - Waiting for main listing form (/lstng?draftId) to load...');
              await waitForUrlAndComplete(tabId, 'lstng', 25000);
              await new Promise(r => setTimeout(r, 2500));
              await ensureDebuggerAttached(debuggee);
              await injectVisualCursor(debuggee);


              const targetProduct = product || DEFAULT_MOCK_PRODUCT;

              // Dynamically inspect DOM and extract complete form schema (saved to storage & logged)
              const formSchema = await extractFormSchema(debuggee);

              // Ensure any open popover dropdown menus are closed first
              await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
                expression: `
                  (function() {
                    const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .fake-menu-button__menu--reverse'));
                    menus.forEach(m => { m.style.display = 'none'; });
                  })()
                `
              });

              // 4a. Photo Upload ("Upload from web" button directly in uploader canvas)
              const uploadPos = await uploadProductImages(debuggee, targetProduct, currentPos.x, currentPos.y);
              currentPos = { x: uploadPos.curX, y: uploadPos.curY };


              // 4b. Fill Title Input
              console.log('[CDP eBay Automator] Step 4b - Updating Item Title...');
              const newTitle = targetProduct.title ? targetProduct.title.slice(0, 80) : 'Grip Strengtheners';
              const titleRes = await cdpHumanInput(debuggee, 'input[name="title"]', newTitle, currentPos);
              if (titleRes.found) {
                currentPos = { x: titleRes.x, y: titleRes.y };
                console.log(`[CDP eBay Automator] Step 4b - Title set via CDP keyboard input: "${newTitle}"`);
              }

              // 4c. AI-Driven Schema Fill – Call Gemini to populate all remaining form fields
              if (formSchema && formSchema.allFields.length > 0) {
                console.log('[CDP eBay Automator] Step 4c - Calling Gemini AI to determine field values...');
                let aiFieldValues: FieldValueMapping[] = [];
                try {
                  aiFieldValues = await generateListingFormValues(targetProduct, formSchema);
                  console.log(`[CDP eBay Automator] Step 4c - Gemini returned ${aiFieldValues.length} field value(s).`);
                } catch (aiErr) {
                  console.error('[CDP eBay Automator] Step 4c - Gemini AI call failed:', aiErr);
                }

                if (aiFieldValues.length > 0) {
                  const schemaFieldMap = new Map(formSchema.allFields.map(f => [f.name, f]));

                  for (const fieldValue of aiFieldValues) {
                    if (fieldValue.name === 'title') continue;

                    const schemaField = schemaFieldMap.get(fieldValue.name);
                    if (!schemaField || !fieldValue.value) continue;

                    const { selector, type, allowCustomValue, options } = schemaField;
                    const value = fieldValue.value.trim();

                    console.log(`[CDP eBay Automator] Step 4c - Filling field "${fieldValue.name}" (${type}) with value: "${value}"`);

                    try {
                      if (type === 'dropdown') {
                        const ddCoords = await smoothScrollToElement(debuggee, selector);
                        if (!ddCoords.found || ddCoords.x === undefined || ddCoords.y === undefined) {
                          console.warn(`[CDP eBay Automator] Step 4c - Dropdown not found for "${fieldValue.name}": ${ddCoords.error}`);
                          continue;
                        }

                        const ddTargetPos: Position = { x: ddCoords.x, y: ddCoords.y };
                        await moveCursorToTargetElement(currentPos, ddTargetPos, debuggee);
                        await dispatchClick(debuggee, ddTargetPos.x, ddTargetPos.y);
                        currentPos = ddTargetPos;
                        await new Promise(r => setTimeout(r, 500 + Math.floor(Math.random() * 200)));

                        const clickResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
                          expression: `
                            (function() {
                              const targetValue = ${JSON.stringify(value.toLowerCase())};
                              const options = ${JSON.stringify(options || [])};
                              const allowCustom = ${JSON.stringify(!!allowCustomValue)};

                              const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .filter-menu, .listbox__options, [role="listbox"]'));
                              const openMenu = menus.find(m => {
                                const style = window.getComputedStyle(m);
                                return style.display !== 'none' && style.visibility !== 'hidden' && m.offsetParent !== null;
                              }) || menus[menus.length - 1];

                              if (!openMenu) return JSON.stringify({ matched: false, reason: 'no open menu found' });

                              const items = Array.from(openMenu.querySelectorAll('.menu__item, .filter-menu__item, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], li'));
                              const matched = items.find(el => {
                                const txt = (el.textContent || '').trim().toLowerCase();
                                return txt === targetValue || txt.includes(targetValue) || targetValue.includes(txt);
                              });

                              if (matched) {
                                matched.click();
                                return JSON.stringify({ matched: true, text: (matched.textContent || '').trim() });
                              }

                              if (allowCustom) {
                                const searchInput = openMenu.querySelector('input[type="text"], input:not([type])');
                                if (searchInput) {
                                  searchInput.focus();
                                  searchInput.value = ${JSON.stringify(value)};
                                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                                  searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                                  setTimeout(() => {
                                    const resultItems = Array.from(openMenu.querySelectorAll('.menu__item, .filter-menu__item, [role="option"], li'));
                                    if (resultItems.length > 0) resultItems[0].click();
                                  }, 300);
                                  return JSON.stringify({ matched: true, custom: true, text: ${JSON.stringify(value)} });
                                }
                              }

                              return JSON.stringify({ matched: false, reason: 'no matching option and no custom input' });
                            })()
                          `,
                          returnByValue: true
                        }) as { result?: { value?: string } };

                        const clickRes = clickResult.result?.value ? JSON.parse(clickResult.result.value as string) : {};
                        if (clickRes.matched) {
                          console.log(`[CDP eBay Automator] Step 4c - Dropdown "${fieldValue.name}" set to: "${clickRes.text || value}" (custom=${clickRes.custom || false})`);
                        } else {
                          console.warn(`[CDP eBay Automator] Step 4c - Dropdown "${fieldValue.name}" could not be matched: ${clickRes.reason}`);
                        }

                        await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 200)));

                      } else if (type === 'select') {
                        await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
                          expression: `
                            (function() {
                              const sel = document.querySelector(${JSON.stringify(selector)});
                              if (!sel) return;
                              const opts = Array.from(sel.options);
                              const targetVal = ${JSON.stringify(value.toLowerCase())};
                              const opt = opts.find(o => o.text.toLowerCase().includes(targetVal) || o.value.toLowerCase().includes(targetVal));
                              if (opt) {
                                sel.value = opt.value;
                                sel.dispatchEvent(new Event('change', { bubbles: true }));
                              }
                            })()
                          `
                        });
                        console.log(`[CDP eBay Automator] Step 4c - Native select "${fieldValue.name}" set to: "${value}"`);

                      } else {
                        const inputRes = await cdpHumanInput(debuggee, selector, value, currentPos);
                        if (inputRes.found) {
                          currentPos = { x: inputRes.x, y: inputRes.y };
                          console.log(`[CDP eBay Automator] Step 4c - Input "${fieldValue.name}" set via CDP keyboard input: "${value}"`);
                        } else {
                          console.warn(`[CDP eBay Automator] Step 4c - Input not found for "${fieldValue.name}": ${inputRes.error}`);
                        }

                        await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 150)));
                      }
                    } catch (fieldErr) {

                      console.error(`[CDP eBay Automator] Step 4c - Error filling field "${fieldValue.name}":`, fieldErr);
                    }
                  }
                  console.log('[CDP eBay Automator] Step 4c - AI-driven form fill complete!');
                } else {
                  console.warn('[CDP eBay Automator] Step 4c - No AI field values returned. Skipping schema-driven fill.');
                }
              } else {
                console.warn('[CDP eBay Automator] Step 4c - No schema available. Skipping AI form fill.');
              }

              console.log('[CDP eBay Automator] All listing form fields populated successfully!');
            } else {
              console.warn('[CDP eBay Automator] Step 3b - "Continue to listing" button not found:', listingBtnCoords.error);
            }
          } else {
            console.warn('[CDP eBay Automator] Step 3a - Condition option not found:', conditionCoords.error);
          }
        } else {
          console.warn('[CDP eBay Automator] Step 2 - "Continue without match" button not found:', continueCoords.error);
        }
      } else {
        console.warn('[CDP eBay Automator] Step 1 - Search button coords not found:', searchCoords.error);
      }
    } catch (err) {
      console.error('[CDP eBay Automator] Automation error:', err);
    } finally {
      chrome.debugger.detach(debuggee).catch(() => {});
      console.log('[CDP eBay Automator] Debugger detached');
    }
  };

  if (tab.status === 'complete') {
    runAutomation();
  } else {
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        runAutomation();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  }
}
