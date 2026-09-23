import { AmazonProduct, FieldValueMapping } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { cdpInjectHumanValue, clickElement } from '@/background/helper';
import { closeOpenMenus } from './formFieldHandlers';

/**
 * Formats a clean, structured product description from product details or AI response.
 */
export function buildFormattedProductDescription(product: AmazonProduct, aiDescription?: string): string {
  if (aiDescription && aiDescription.trim().length > 20) {
    return aiDescription.trim();
  }

  const parts: string[] = [];

  if (product.title) {
    parts.push(product.title);
  }

  if (product.description) {
    parts.push(product.description);
  }

  if (product.features && product.features.length > 0) {
    parts.push('Key Features & Highlights:');
    product.features.forEach(feat => {
      parts.push(`- ${feat}`);
    });
  }

  if (product.specifications && Object.keys(product.specifications).length > 0) {
    parts.push('Item Specifications:');
    Object.entries(product.specifications).forEach(([key, val]) => {
      parts.push(`${key}: ${val}`);
    });
  }

  return parts.join('\n\n');
}

/**
 * Fills item description into eBay's description editor using cdpHumanInput
 * to simulate authentic human mouse movement and CDP keyboard entry.
 */
export async function fillDescription(
  debuggee: chrome.debugger.Debuggee,
  targetProduct: AmazonProduct,
  productFormValues: FieldValueMapping[] = [],
  currentPosition: Position = { x: 100, y: 100 }
): Promise<Position> {
  console.log('[CDP eBay Automator] Step - Filling Item Description section via cdpHumanInput...');

  try {
    // 1. Determine description text (AI response or formatted product details)
    const aiDescValue = productFormValues.find(
      v => v.name.toLowerCase() === 'description' || v.label?.toLowerCase() === 'description'
    )?.value;

    const descriptionText = buildFormattedProductDescription(targetProduct, aiDescValue);

    // 2. Target selector for eBay description editor (contenteditable div, iframe, or textarea)
    const descEditorSelector = '.se-description-editor [contenteditable="true"], [data-testid="description-editor"] [contenteditable="true"], [aria-label*="description" i][contenteditable="true"], iframe[title*="Description" i], textarea[name="description"], textarea#description, textarea[aria-label*="description" i]';
    
    // 3. Click and inject text via CDP
    currentPosition = await clickElement(debuggee, descEditorSelector, true, currentPosition);
    await cdpInjectHumanValue(
      debuggee,
      descriptionText,
      descEditorSelector,
    );

    // 4. Blur editor focus and close any active popovers/menus
    await closeOpenMenus(debuggee);
    await new Promise(r => setTimeout(r, 400));
  } catch (error) {
    console.error('[CDP eBay Automator] Error in fillDescription:', error);
  }

  return currentPosition;
}