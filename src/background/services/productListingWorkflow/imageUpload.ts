import { Position } from '@/background/helper/moveCursorToTargetElement';
import { moveCursorAndClick } from '@/background/helper/moveCursorAndClick';
import { AmazonProduct } from '../../../types';
import {
  injectVisualCursor,
  getElementCoords,
  clickOutsideModal,
  smoothScrollToElement
} from '../cdpHelper';
import { togglePhotoWebPreference } from './togglePhotoWebPreference';
import {
  clickAddAdditionalButton,
  injectImageUrl
} from './injectImageUrlInput';

export interface ImageUploadPosition {
  curX: number;
  curY: number;
}

const UPLOAD_WEB_BTN_SELECTOR = '.upload-buttons button:nth-child(2), button.btn--tertiary:nth-of-type(2), text:Upload from web';
const SEE_OPTIONS_SELECTOR = '.se-expand-button__button, button.fake-menu-button__button, text:See photo options';
const DONE_MODAL_BTN_SELECTOR = '.se-panel-container__header-suffix button, button.btn--secondary, [role="dialog"] button.btn--primary, text:Done';

/**
 * Ensures the "Upload from web" button is visible and active.
 * If hidden, opens "See photo options" and toggles the web photo preference on.
 */
export async function ensureUploadFromWebButton(
  debuggee: chrome.debugger.Debuggee,
  currentPosition: Position
): Promise<{ found: boolean; coords?: Position; currentPosition: Position; error?: string }> {
  let uploadWebCoords = await smoothScrollToElement(debuggee, UPLOAD_WEB_BTN_SELECTOR);

  // If "Upload from web" button is missing, enable it in "See photo options"
  if (!uploadWebCoords.found || uploadWebCoords.x === undefined || uploadWebCoords.y === undefined) {
    console.log('[CDP eBay Automator] Step 4a - "Upload from web" button not visible. Opening "See photo options"...');

    const seeOptionsCoords = await smoothScrollToElement(debuggee, SEE_OPTIONS_SELECTOR);

    if (seeOptionsCoords.found && seeOptionsCoords.x !== undefined && seeOptionsCoords.y !== undefined) {
      currentPosition = await moveCursorAndClick(
        currentPosition,
        { x: seeOptionsCoords.x, y: seeOptionsCoords.y },
        debuggee,
        'Step 4a - Opening "See photo options"...'
      );
      await new Promise(r => setTimeout(r, 600));

      // Toggle "Upload photos from web" switch if unchecked
      console.log('[CDP eBay Automator] Step 4a - Checking "Upload photos from web" switch...');
      const toggleInfo = await togglePhotoWebPreference(debuggee);
      console.log(`[CDP eBay Automator] Step 4a - Photo web preference toggle state:`, toggleInfo);

      await new Promise(r => setTimeout(r, 800));

      // Re-query "Upload from web" button after enabling preference
      uploadWebCoords = await smoothScrollToElement(debuggee, UPLOAD_WEB_BTN_SELECTOR);
    }
  }

  if (uploadWebCoords.found && uploadWebCoords.x !== undefined && uploadWebCoords.y !== undefined) {
    return {
      found: true,
      coords: { x: uploadWebCoords.x, y: uploadWebCoords.y },
      currentPosition
    };
  }

  return {
    found: false,
    currentPosition,
    error: uploadWebCoords.error || 'Could not locate "Upload from web" button'
  };
}

/**
 * Clicks the "Upload from web" button and waits for the import lightbox modal to appear.
 */
export async function openImageUploadModal(
  debuggee: chrome.debugger.Debuggee,
  currentPosition: Position,
  btnCoords: Position
): Promise<Position> {
  console.log(`[CDP eBay Automator] Step 4a - Opening "Import from web" modal at (${btnCoords.x}, ${btnCoords.y})...`);

  currentPosition = await moveCursorAndClick(
    currentPosition,
    btnCoords,
    debuggee,
    'Step 4a - Clicking "Upload from web" button...'
  );

  // Wait for the "Import from web" lightbox modal to appear
  await new Promise(r => setTimeout(r, 1800));
  await injectVisualCursor(debuggee);

  return currentPosition;
}

/**
 * Sequentially populates image URLs into the modal inputs, clicking "+ Add additional"
 * between rows when the next row is not already present.
 */
export async function populateImageUrls(
  debuggee: chrome.debugger.Debuggee,
  urls: string[],
  currentPosition: Position
): Promise<Position> {
  console.log(`[CDP eBay Automator] Step 4a - Populating ${urls.length} image URLs in popup modal...`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[CDP eBay Automator] Step 4a - Processing Image ${i + 1}/${urls.length}: ${url}`);

    const injectRes = await injectImageUrl(debuggee, url, i, currentPosition);
    
    if (injectRes.success) {
      currentPosition = injectRes.currentPosition;
      console.log(`[CDP eBay Automator] Step 4a - Successfully injected URL ${i + 1}: ${url}`);
      await new Promise(r => setTimeout(r, 400));

      // After inputting value, if more images exist, ensure the next input row is present
      if (i < urls.length - 1) {
        console.log(`[CDP eBay Automator] Step 4a - Row for URL ${i + 2} not present. Clicking "+ Add additional"...`);
        currentPosition = await clickAddAdditionalButton(debuggee, currentPosition);
        await new Promise(r => setTimeout(r, 600));
      }
    } else {
      console.warn(`[CDP eBay Automator] Step 4a - Could NOT inject image ${i + 1}: ${injectRes.error}`);
    }
  }

  await new Promise(r => setTimeout(r, 600));
  return currentPosition;
}

/**
 * Finalizes the image upload by clicking the "Done" button in the modal header,
 * or clicking outside the modal as a fallback.
 */
export async function submitImageUploadModal(
  debuggee: chrome.debugger.Debuggee,
  currentPosition: Position
): Promise<Position> {
  const doneCoords = await getElementCoords(debuggee, DONE_MODAL_BTN_SELECTOR);

  if (doneCoords.found && doneCoords.x !== undefined && doneCoords.y !== undefined) {
    currentPosition = await moveCursorAndClick(
      currentPosition,
      { x: doneCoords.x, y: doneCoords.y },
      debuggee,
      `Step 4a - Clicking modal "Done" button at (${doneCoords.x}, ${doneCoords.y})`
    );
  } else {
    console.log('[CDP eBay Automator] Step 4a - Modal "Done" button not found. Using fallback click outside.');
    currentPosition = await clickOutsideModal(debuggee, currentPosition.x, currentPosition.y);
  }

  return currentPosition;
}

/**
 * Automates the complete eBay product image upload process:
 * 1. Checks and enables "Upload from web" preference if needed.
 * 2. Opens the "Import from web" modal.
 * 3. Populates image URLs sequentially.
 * 4. Submits the modal.
 */
export async function uploadProductImages(
  debuggee: chrome.debugger.Debuggee,
  targetProduct: AmazonProduct,
  curX: number,
  curY: number
): Promise<ImageUploadPosition> {
  console.log('[CDP eBay Automator] Step 4a - Attempting Photo Upload via "Upload from web"...');

  let currentPosition: Position = { x: curX, y: curY };

  // 1. Ensure "Upload from web" button is accessible
  const webBtn = await ensureUploadFromWebButton(debuggee, currentPosition);
  if (!webBtn.found || !webBtn.coords) {
    console.warn('[CDP eBay Automator] Step 4a - "Upload from web" button could not be accessed:', webBtn.error);
    return { curX: currentPosition.x, curY: currentPosition.y };
  }
  currentPosition = webBtn.currentPosition;

  // 2. Open the "Import from web" modal
  currentPosition = await openImageUploadModal(debuggee, currentPosition, webBtn.coords);

  // 3. Extract and populate image URLs
  const imageUrls = targetProduct.images && targetProduct.images.length > 0
    ? targetProduct.images
    : (targetProduct.mainImage ? [targetProduct.mainImage] : []);
  const urlsToUpload = imageUrls.slice(0, 24);

  currentPosition = await populateImageUrls(debuggee, urlsToUpload, currentPosition);

  // 4. Click "Done" to submit and close modal
  currentPosition = await submitImageUploadModal(debuggee, currentPosition);

  return { curX: currentPosition.x, curY: currentPosition.y };
}
