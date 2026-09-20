import { moveCursorToTargetElement, Position } from '@/background/helper/moveCursorToTargetElement';
import { AmazonProduct } from '../../../types';
import {
  injectVisualCursor,
  dispatchClick,
  getElementCoords,
  clickOutsideModal,
  smoothScrollToElement
} from '../cdpHelper';
import { togglePhotoWebPreference } from './togglePhotoWebPreference';
import { injectImageUrlInput } from './injectImageUrlInput';

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
      const toggleInfo = await togglePhotoWebPreference(debuggee);
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

      const injectRes = await injectImageUrlInput(debuggee, url, i);

      if (injectRes.found && injectRes.x !== undefined && injectRes.y !== undefined) {
        console.log(`[CDP eBay Automator] Step 4a - Successfully injected URL ${i + 1} into input (${injectRes.x}, ${injectRes.y}): ${url}`);

        // Move visual cursor to the populated input element
        const targetPos: Position = { x: injectRes.x, y: injectRes.y };
        await moveCursorToTargetElement(currentPos, targetPos, debuggee);
        currentPos = targetPos;

        await new Promise(r => setTimeout(r, 400));
      } else {
        console.warn(`[CDP eBay Automator] Step 4a - Could NOT inject image ${i + 1}: ${injectRes.error}`);
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
