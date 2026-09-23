import { AmazonProduct, FormFieldSchema } from '../../../types';
import { Position } from '@/background/helper/moveCursorToTargetElement';
import { clickElement } from '../cdpHelper';
import {
  buildExtractItemSpecificsInUiOrderScript,
  buildClickPillButtonScript,
  buildClickMatchingDropdownOptionScript,
  buildCloseOpenMenusScript
} from '../../injectors';
import { generateItemSpecificsValues } from '../../../apis';
import { cdpInjectHumanValue } from '@/background/helper';

export async function extractItemSpecificFields(debuggee: chrome.debugger.Debuggee) {
  let itemSpecificFields: FormFieldSchema[] = [];
  const maxRetries = 5;
  const retryInterval = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const evaluatedResult = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
        expression: buildExtractItemSpecificsInUiOrderScript(),
        returnByValue: true
      }) as { result?: { value?: string } };

      if (evaluatedResult.result?.value) {
        const parsed = JSON.parse(evaluatedResult.result.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          itemSpecificFields = parsed;
          console.log(`[CDP eBay Automator] Item Specifics - Extracted ${itemSpecificFields.length} field(s) dynamically on attempt ${attempt}/${maxRetries}.`);
          console.log(`[CDP eBay Automator] Item Specifics - Extracted fields:`, JSON.stringify(itemSpecificFields));
          return itemSpecificFields;
        }
      }
    } catch (evalErr) {
      console.warn(`[CDP eBay Automator] Item Specifics - Dynamic extraction attempt ${attempt}/${maxRetries} failed:`, evalErr);
    }

    if (attempt < maxRetries) {
      console.log(`[CDP eBay Automator] Item Specifics - No fields found on attempt ${attempt}/${maxRetries}. Polling again in ${retryInterval}ms...`);
      await new Promise(r => setTimeout(r, retryInterval));
    }
  }
  console.warn(`[CDP eBay Automator] Item Specifics - No fields found after ${maxRetries} attempts.`);
  return itemSpecificFields;
}

async function getItemSpecificFieldsValues(targetProduct: AmazonProduct, itemSpecificFields: FormFieldSchema[]) {
  const aiValueMap = new Map<string, string>();
  if (targetProduct && itemSpecificFields.length > 0) {
    try {
      const dedicatedValues = await generateItemSpecificsValues(targetProduct, itemSpecificFields);

      if (dedicatedValues && dedicatedValues.length > 0) {
        console.log(`[CDP eBay Automator] Dedicated Item Specifics AI generated ${dedicatedValues.length} value(s):`, JSON.stringify(dedicatedValues));
        for (const item of dedicatedValues) {
          if (item.name && item.value) {
            aiValueMap.set(item.name.toLowerCase(), item.value.trim());
          }
          if (item.label && item.value) {
            aiValueMap.set(item.label.toLowerCase(), item.value.trim());
          }
        }
      }
    } catch (itemAiErr) {
      console.warn('[CDP eBay Automator] Dedicated Item Specifics AI call failed, using fallback values:', itemAiErr);
    }
  }
  return aiValueMap;
}

export const fillItemSpecificPill = async (debuggee: chrome.debugger.Debuggee, label: string, value: string) => {
  console.log(`[CDP eBay Automator] Item Specifics - Clicking pill button for "${label}" with value: "${value}"`);
  const script = buildClickPillButtonScript(label, value);
  const res = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: script,
    returnByValue: true
  }) as { result?: { value?: string } };

  if (res.result?.value) {
    try {
      const parsed = JSON.parse(res.result.value);
      if (parsed.clicked) {
        console.log(`[CDP eBay Automator] Item Specifics - Successfully clicked pill option "${parsed.text}" for "${label}"`);
        return;
      } else {
        console.warn(`[CDP eBay Automator] Item Specifics - Pill button click failed for "${label}":`, parsed.error);
      }
    } catch (e) {
      console.warn(`[CDP eBay Automator] Item Specifics - Failed to parse pill button result for "${label}":`, e);
    }
  }
};

async function fillItemSpecificValues(itemSpecificFields: FormFieldSchema[], aiValueMap: Map<string, string>, debuggee: chrome.debugger.Debuggee) {
  for (let index = 0; index < itemSpecificFields.length; index++) {
    await new Promise(r => setTimeout(r, 500 + Math.floor(Math.random() * 200)));

    const field = itemSpecificFields[index];
    const value =
      aiValueMap.get(field.name.toLowerCase()) ||
      aiValueMap.get(field.label.toLowerCase());

    if (!value) {
      console.log(`[CDP eBay Automator] Item Specifics (UI #${index + 1}/${itemSpecificFields.length}) - Skipping "${field.label || field.name}": No AI value provided.`);
      continue;
    }

    console.log(`[CDP eBay Automator] Item Specifics (UI #${index + 1}/${itemSpecificFields.length}) - Filling "${field.label || field.name}" (${field.type}) with value: "${value}"`);

    try {
      if (field.type === 'pill') {
        await fillItemSpecificPill(debuggee, field.label || field.name.replace('attributes.', ''), value);
      } else if (["multiselect", "dropdown", "select"].includes(field.type)) {
        await fillItemSpecificDropdown(debuggee, field.selector, value, field.type, field.allowCustomValue);
      } else {
        await cdpInjectHumanValue(debuggee, value, field.selector);
      }
    } catch (fieldErr) {
      console.error(`[CDP eBay Automator] Item Specifics (UI #${index + 1}/${itemSpecificFields.length}) - Error processing "${field.label || field.name}":`, fieldErr);
    }
  }
}

export async function fillItemSpecifics(
  debuggee: chrome.debugger.Debuggee,
  currentPosition: Position,
  targetProduct: AmazonProduct
): Promise<Position> {
  try {
    let itemSpecificFields: FormFieldSchema[] = await extractItemSpecificFields(debuggee);

    if (itemSpecificFields.length === 0) {
      console.warn('[CDP eBay Automator] Item Specifics - No item specific fields found on page after polling.');
      return currentPosition;
    }

    console.log(`[CDP eBay Automator] Item Specifics - Processing ${itemSpecificFields.length} field(s) in strict UI reading order:`, itemSpecificFields.map(f => f.label || f.name));

    const aiValueMap = await getItemSpecificFieldsValues(targetProduct, itemSpecificFields);
    await fillItemSpecificValues(itemSpecificFields, aiValueMap, debuggee);

    console.log('[CDP eBay Automator] Item Specifics UI order fill complete!');
  } catch (error) {
    console.error('[CDP eBay Automator] Error in fillItemSpecifics:', error);
  }

  return currentPosition;
}

export const fillItemSpecificDropdown = async (
  debuggee: chrome.debugger.Debuggee,
  selector: string,
  value: string,
  type?: string,
  allowCustomValue?: boolean
) => {
  const dropDownClickRes = await clickElement(debuggee, selector);
  if (!dropDownClickRes.found) {
    console.warn(`[CDP eBay Automator] Item Specifics - Dropdown click not found for "${selector}"`);
    return;
  } else {
    console.log(`[CDP eBay Automator] Item Specifics - Dropdown click found for "${selector}" with target value "${value}"`);
  }

  await new Promise(r => setTimeout(r, 600));
  const cleanName = selector.replace(/.*attributes\./, '').replace(/[^a-zA-Z0-9]/g, '');
  const inputSelector = `input[name="search-box-attributes${cleanName}"], input[name="search-box-attributes.${cleanName}"]`;

  if (type === 'multiselect') {
    const values = value.split(',');
    for (const val of values) {
      const trimmedVal = val.trim();
      if (!trimmedVal) continue;

      await cdpInjectHumanValue(debuggee, trimmedVal, inputSelector);
      await new Promise(r => setTimeout(r, 400));

      await chrome.debugger.sendCommand(debuggee, 'Input.dispatchKeyEvent', {
        type: 'keyDown',
        windowsVirtualKeyCode: 13,
        key: 'Enter',
        code: 'Enter',
        text: '\r'
      });
      await new Promise(r => setTimeout(r, 300));
    }
  } else {
    await cdpInjectHumanValue(debuggee, value, inputSelector);
    await new Promise(r => setTimeout(r, 400));

    const clickOptRes = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: buildClickMatchingDropdownOptionScript(selector, value),
      returnByValue: true
    }) as { result?: { value?: string } };

    let optionClicked = false;
    if (clickOptRes.result?.value) {
      try {
        const parsed = JSON.parse(clickOptRes.result.value);
        optionClicked = !!parsed.clicked;
        if (optionClicked) {
          console.log(`[CDP eBay Automator] Item Specifics - Selected dropdown option "${parsed.text}" for "${selector}"`);
        }
      } catch (e) {}
    }

    if (!optionClicked) {
      console.log(`[CDP eBay Automator] Item Specifics - Option item not clicked directly for "${selector}". Fallback: sending Enter key (allowCustomValue=${allowCustomValue}).`);
      await chrome.debugger.sendCommand(debuggee, 'Input.dispatchKeyEvent', {
        type: 'keyDown',
        windowsVirtualKeyCode: 13,
        key: 'Enter',
        code: 'Enter',
        text: '\r'
      });
    }
  }

  await new Promise(r => setTimeout(r, 400));
  await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
    expression: buildCloseOpenMenusScript(),
    returnByValue: true
  });
};
 