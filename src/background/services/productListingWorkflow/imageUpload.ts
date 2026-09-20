import { moveCursorToTargetElement, Position } from '@/background/helper/moveCursorToTargetElement';
import { AmazonProduct } from '../../../types';
import {
  injectVisualCursor,
  dispatchClick,
  cdpHumanInput,
  getElementCoords,
  clickOutsideModal,
  smoothScrollToElement
} from '../cdpHelper';

export interface ImageUploadPosition {
  curX: number;
  curY: number;
}

/**
 * Automates eBay listing image upload modal using CDP human-mimicking inputs.
 * 1. Checks if "Upload from web" button is present. If not, opens "See photo options" menu and enables "Upload photos from web" switch.
 * 2. Clicks "Upload from web" button to open the "Import from web" popup lightbox modal.
 * 3. Sequentially populates image URLs (URL 1, URL 2, ...) clicking "+ Add additional" between rows.
 * 4. Submits the modal by clicking the "Done" button.
 */
export async function uploadProductImages(
  debuggee: chrome.debugger.Debuggee,
  targetProduct: AmazonProduct,
  curX: number,
  curY: number
): Promise<ImageUploadPosition> {
  console.log('[CDP eBay Automator] Step 4a - Attempting Photo Upload via "Upload from web"...');
  
  let currentPos: Position = { x: curX, y: curY };
  const uploadWebBtnSelector = '.upload-buttons button:nth-child(2), button.btn--tertiary:nth-of-type(2), text:Upload from web';
  let uploadWebCoords = await smoothScrollToElement(debuggee, uploadWebBtnSelector);

  // ── 1. Preference Handling: If "Upload from web" button is missing, enable it in "See photo options" ──
  if (!uploadWebCoords.found || uploadWebCoords.x === undefined || uploadWebCoords.y === undefined) {
    console.log('[CDP eBay Automator] Step 4a - "Upload from web" button not visible. Opening "See photo options"...');
    
    const seeOptionsSelector = '.se-expand-button__button, button.fake-menu-button__button, text:See photo options';
    const seeOptionsCoords = await smoothScrollToElement(debuggee, seeOptionsSelector);

    if (seeOptionsCoords.found && seeOptionsCoords.x !== undefined && seeOptionsCoords.y !== undefined) {
      const targetPos: Position = { x: seeOptionsCoords.x, y: seeOptionsCoords.y };
      await moveCursorToTargetElement(currentPos, targetPos, debuggee);
      await dispatchClick(debuggee, targetPos.x, targetPos.y);
      currentPos = targetPos;
      await new Promise(r => setTimeout(r, 600));

      // Toggle "Upload photos from web" switch if unchecked
      console.log('[CDP eBay Automator] Step 4a - Checking "Upload photos from web" switch...');
      const toggleRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
        expression: `
          (function() {
            const webSwitch = document.querySelector('input[name="photoUploadWebPref"], input[aria-label="Upload photos from web"]');
            if (!webSwitch) return JSON.stringify({ found: false });
            if (!webSwitch.checked) {
              const label = webSwitch.closest('.se-field') || webSwitch.parentElement;
              (label || webSwitch).click();
              return JSON.stringify({ found: true, toggled: true });
            }
            return JSON.stringify({ found: true, toggled: false });
          })()
        `,
        returnByValue: true
      }) as { result?: { value?: string } };

      const toggleInfo = toggleRes.result?.value ? JSON.parse(toggleRes.result.value) : { found: false };
      console.log(`[CDP eBay Automator] Step 4a - Photo web preference toggle state:`, toggleInfo);
      
      await new Promise(r => setTimeout(r, 800));

      // Re-query "Upload from web" button after enabling preference
      uploadWebCoords = await smoothScrollToElement(debuggee, uploadWebBtnSelector);
    }
  }

  // ── 2. Click "Upload from web" Button to open popup modal ─────────────────
  if (uploadWebCoords.found && uploadWebCoords.x !== undefined && uploadWebCoords.y !== undefined) {
    console.log(`[CDP eBay Automator] Step 4a - Found "Upload from web" button at (${uploadWebCoords.x}, ${uploadWebCoords.y})`);
    
    const targetPos: Position = { x: uploadWebCoords.x, y: uploadWebCoords.y };
    await moveCursorToTargetElement(currentPos, targetPos, debuggee);
    console.log('[CDP eBay Automator] Step 4a - Clicking "Upload from web" button...');
    await dispatchClick(debuggee, targetPos.x, targetPos.y);
    currentPos = targetPos;

    // Wait for the "Import from web" lightbox modal to appear
    await new Promise(r => setTimeout(r, 1800));
    await injectVisualCursor(debuggee);

    const imageUrls = targetProduct.images && targetProduct.images.length > 0
      ? targetProduct.images
      : (targetProduct.mainImage ? [targetProduct.mainImage] : []);

    const urlsToUpload = imageUrls.slice(0, 24);
    console.log(`[CDP eBay Automator] Step 4a - Populating ${urlsToUpload.length} image URLs in popup modal...`);

    // ── 3. Populate Image URLs (URL 1, URL 2, ...) ───────────────────────────
    for (let i = 0; i < urlsToUpload.length; i++) {
      const url = urlsToUpload[i];
      console.log(`[CDP eBay Automator] Step 4a - Processing Image ${i + 1}/${urlsToUpload.length}: ${url}`);
      
      let inputCoords: { found: boolean; x?: number; y?: number; error?: string } = { found: false };

      // Retry locating URL input for index i up to 5 times (modal render delays)
      for (let retry = 0; retry < 5; retry++) {
        const inputCoordsRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
          expression: `
            (function() {
              // 1. Try exact eBay pattern [i]-se-textbox using JS string matching
              const allInputs = Array.from(document.querySelectorAll('input'));
              let targetInput = allInputs.find(inp => inp.id && (inp.id.includes('[' + ${i} + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + ${i} + ']'))));
              
              if (!targetInput) {
                // 2. Try .url-row container index i
                const urlRows = Array.from(document.querySelectorAll('.url-row'));
                if (urlRows[${i}]) {
                  targetInput = urlRows[${i}].querySelector('input.textbox__control, input');
                }
              }

              if (!targetInput) {
                // 3. Query all visible inputs in photo modal dialog
                const modal = document.querySelector('.lightbox-dialog__main, [role="dialog"], [aria-modal="true"], .se-panel-container') || document.body;
                const inputs = Array.from(modal.querySelectorAll('.url-row input, input.textbox__control, input[type="text"], input'));
                const visibleInputs = inputs.filter(inp => {
                  const style = window.getComputedStyle(inp);
                  const rect = inp.getBoundingClientRect();
                  return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
                });
                targetInput = visibleInputs[${i}] || visibleInputs.find(inp => !inp.value.trim()) || visibleInputs[visibleInputs.length - 1];
              }

              if (!targetInput) return JSON.stringify({ found: false, error: 'No visible input element found' });
              
              targetInput.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
              targetInput.focus();
              const rect = targetInput.getBoundingClientRect();
              return JSON.stringify({
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              });
            })()
          `,
          returnByValue: true
        }) as { result?: { value?: string } };

        inputCoords = inputCoordsRes.result?.value ? JSON.parse(inputCoordsRes.result.value) : { found: false };
        if (inputCoords.found) break;
        await new Promise(r => setTimeout(r, 350));
      }
      
      if (inputCoords.found && inputCoords.x !== undefined && inputCoords.y !== undefined) {
        console.log(`[CDP eBay Automator] Step 4a - Found URL ${i + 1} input at (${inputCoords.x}, ${inputCoords.y})`);
        
        // Type image URL into current input row using cdpHumanInput
        const typeRes = await cdpHumanInput(
          debuggee,
          { x: inputCoords.x, y: inputCoords.y },
          url,
          currentPos
        );

        if (typeRes.found) {
          currentPos = { x: typeRes.x, y: typeRes.y };
        }

        console.log(`[CDP eBay Automator] Step 4a - Entered image URL ${i + 1}: ${url}`);
        await new Promise(r => setTimeout(r, 400));

        // Click "+ Add additional" button (button[name="addAdditional"]) if more URLs remain
        if (i < urlsToUpload.length - 1) {
          const addBtnSelector = 'button[name="addAdditional"], button.row-button, text:Add additional';
          const addBtnCoords = await getElementCoords(debuggee, addBtnSelector);
          
          if (addBtnCoords.found && addBtnCoords.x !== undefined && addBtnCoords.y !== undefined) {
            console.log(`[CDP eBay Automator] Step 4a - Clicking "+ Add additional" button for next URL row...`);
            const addPos: Position = { x: addBtnCoords.x, y: addBtnCoords.y };
            await moveCursorToTargetElement(currentPos, addPos, debuggee);
            await dispatchClick(debuggee, addPos.x, addPos.y);
            currentPos = addPos;
            await new Promise(r => setTimeout(r, 700));
          } else {
            console.warn('[CDP eBay Automator] Step 4a - "+ Add additional" button not found.');
          }
        }
      } else {
        console.warn(`[CDP eBay Automator] Step 4a - Could NOT find input field for image ${i + 1}: ${inputCoords.error}`);
      }
    }

    await new Promise(r => setTimeout(r, 600));

    // ── 4. Click "Done" Button in modal header suffix ─────────────────────────
    const doneModalBtnSelector = '.se-panel-container__header-suffix button, button.btn--secondary, [role="dialog"] button.btn--primary, text:Done';
    const doneCoords = await getElementCoords(debuggee, doneModalBtnSelector);

    if (doneCoords.found && doneCoords.x !== undefined && doneCoords.y !== undefined) {
      console.log(`[CDP eBay Automator] Step 4a - Clicking modal "Done" button at (${doneCoords.x}, ${doneCoords.y})`);
      const donePos: Position = { x: doneCoords.x, y: doneCoords.y };
      await moveCursorToTargetElement(currentPos, donePos, debuggee);
      await dispatchClick(debuggee, donePos.x, donePos.y);
      currentPos = donePos;
    } else {
      console.log('[CDP eBay Automator] Step 4a - Modal "Done" button not found. Using fallback click outside.');
      currentPos = await clickOutsideModal(debuggee, currentPos.x, currentPos.y);
    }
  } else {
    console.warn('[CDP eBay Automator] Step 4a - "Upload from web" button could not be accessed:', uploadWebCoords.error);
  }

  return { curX: currentPos.x, curY: currentPos.y };
}
