import { ListingFormSchema, FormFieldSchema } from '../../types';
import { saveFormSchema } from './storageService';

/**
 * Dynamically extracts full form schema from eBay listing page (/lstng?draftId=...)
 * including all section titles, field labels, input names, element IDs, field types, options, and CSS selectors.
 */
export async function extractFormSchema(debuggee: chrome.debugger.Debuggee): Promise<ListingFormSchema | null> {
  console.log('[Schema Extractor] Extracting form schema from listing page...');
  try {
    const res = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function extractEbayFormSchema() {
          const allFields = [];

          // 1. Title
          const titleInput = document.querySelector('input[name="title"]');
          if (titleInput) {
            allFields.push({
              id: titleInput.id || 'title',
              name: 'title',
              label: 'Item title',
              type: 'text',
              section: 'Title',
              required: true,
              currentValue: titleInput.value || '',
              maxLength: titleInput.maxLength > 0 ? titleInput.maxLength : 80,
              selector: 'input[name="title"]'
            });
          }

          // 2. Category
          const categoryBtn = document.querySelector('button[name="categoryId"]');
          if (categoryBtn) {
            const catName = (categoryBtn.textContent || '').trim();
            const pathEl = categoryBtn.closest('div')?.querySelector('.value-secondary');
            const catPath = pathEl ? (pathEl.textContent || '').trim() : '';
            allFields.push({
              id: categoryBtn.id || 'categoryId',
              name: 'categoryId',
              label: 'Item category',
              type: 'text',
              section: 'Item category',
              required: true,
              currentValue: catName + (catPath ? ' (' + catPath + ')' : ''),
              selector: 'button[name="categoryId"]'
            });
          }

          // 3. Item Specifics (Attributes)
          const attrFields = Array.from(document.querySelectorAll('[data-testid="attribute"]'));
          attrFields.forEach(attrEl => {
            const labelBtn = attrEl.querySelector('.summary__attributes--label button, .summary__attributes--label label');
            const label = labelBtn ? (labelBtn.textContent || '').trim() : '';
            if (!label) return;

            const fieldset = attrEl.closest('fieldset');
            const subsection = fieldset ? (fieldset.querySelector('legend h3')?.textContent || '').trim() : '';

            const btn = attrEl.querySelector('button[name^="attributes."]');
            const input = attrEl.querySelector('input[name^="attributes."]');

            if (btn) {
              const name = btn.getAttribute('name') || '';
              const menuId = btn.getAttribute('aria-controls');
              const menu = menuId ? document.getElementById(menuId) : null;
              const optionItems = menu ? Array.from(menu.querySelectorAll('.menu__item span, .filter-menu__text')) : [];
              const options = optionItems.map(o => (o.textContent || '').trim()).filter(Boolean);

              const searchBox = menu ? menu.querySelector('.se-search-box input, input[name^="search-box-"]') : null;
              const searchPlaceholder = searchBox ? (searchBox.getAttribute('placeholder') || searchBox.getAttribute('aria-label') || '').toLowerCase() : '';
              const allowCustomValue = searchPlaceholder.includes('enter your own') || searchPlaceholder.includes('search or enter') || searchBox !== null;

              allFields.push({
                id: btn.id || ('attr-' + name),
                name: name,
                label: label,
                type: 'dropdown',
                section: 'Item specifics',
                subsection: subsection,
                required: attrEl.querySelector('.required-field') !== null,
                currentValue: (btn.querySelector('.btn__text')?.textContent || '').trim(),
                options: options,
                allowCustomValue: allowCustomValue,
                selector: 'button[name="' + name + '"]'
              });
            } else if (input) {
              const name = input.getAttribute('name') || '';
              allFields.push({
                id: input.id || ('attr-' + name),
                name: name,
                label: label,
                type: 'text',
                section: 'Item specifics',
                subsection: subsection,
                required: attrEl.querySelector('.required-field') !== null,
                currentValue: input.value || '',
                placeholder: input.placeholder || '',
                selector: 'input[name="' + name + '"]'
              });
            }
          });

          // 4. Condition
          const condBtn = document.querySelector('button[name="condition"], #summary-condition-field-value');
          if (condBtn) {
            allFields.push({
              id: condBtn.id || 'condition',
              name: condBtn.getAttribute('name') || 'condition',
              label: 'Item condition',
              type: 'dropdown',
              section: 'Condition',
              required: true,
              currentValue: (condBtn.textContent || '').trim(),
              selector: 'button[name="condition"], #summary-condition-field-value'
            });
          }

          // 5. Pricing (Format master dropdown only - subfields dynamically extracted in pricingStep)
          const priceContainer = document.querySelector('.summary__price, [class*="summary__price"]');
          if (priceContainer) {
            const formatNativeSelect = priceContainer.querySelector('select[name="format"]');
            const formatBtn = priceContainer.querySelector('.format button, button[aria-labelledby*="format"]');
            if (formatNativeSelect || formatBtn) {
              allFields.push({
                id: formatNativeSelect?.id || formatBtn?.id || 'format',
                name: 'format',
                label: 'Format',
                type: 'select',
                section: 'Pricing',
                required: true,
                currentValue: (formatBtn?.querySelector('.btn__text')?.textContent || formatNativeSelect?.value || '').trim(),
                options: ['Auction', 'Buy It Now'],
                selector: '.format button, select[name="format"], button[aria-labelledby*="format"]'
              });
            }
          }

          // 6. Shipping (DomesticShippingType master dropdown only - subfields dynamically extracted in shippingStep)
          const shippingContainer = document.querySelector('.summary__shipping, [class*="summary__shipping"]');
          if (shippingContainer) {
            const shipMethodBtn = shippingContainer.querySelector('button[aria-labelledby*="domesticShippingType"], .summary__shipping--field button');
            const shipNativeSelect = shippingContainer.querySelector('select[name="domesticShippingType"]');
            if (shipMethodBtn || shipNativeSelect) {
              allFields.push({
                id: shipNativeSelect?.id || shipMethodBtn?.id || 'domesticShippingType',
                name: 'domesticShippingType',
                label: 'Shipping method',
                type: 'select',
                section: 'Shipping',
                required: true,
                currentValue: (shipMethodBtn?.querySelector('.btn__text')?.textContent || shipNativeSelect?.value || '').trim(),
                options: [
                  'Standard shipping: Small to medium items',
                  'Freight: Large items that require special handling',
                  'No shipping. Local pickup only'
                ],
                selector: 'button[aria-labelledby*="domesticShippingType"], .summary__shipping--field button, select[name="domesticShippingType"]'
              });
            }
          }

          // 7. Generic fallback for any uncaptured form controls (skipping pricing & shipping dynamic sections)
          const remainingControls = Array.from(document.querySelectorAll('input[name], select[name], textarea[name]'));
          remainingControls.forEach(ctrl => {
            const name = ctrl.getAttribute('name');
            if (!name || name.startsWith('search-box-') || name.endsWith('-hidden') || allFields.some(f => f.name === name)) return;
            if (ctrl.closest('.summary__price, [class*="summary__price"], .summary__shipping, [class*="summary__shipping"]')) return;

            const labelEl = ctrl.closest('.se-field')?.querySelector('.field__label, label');
            const label = labelEl ? (labelEl.textContent || '').trim() : name;
            allFields.push({
              id: ctrl.id || ('ctrl-' + name),
              name: name,
              label: label,
              type: ctrl.tagName.toLowerCase() === 'select' ? 'select' : (ctrl.type || 'text'),
              section: 'General',
              required: ctrl.required || ctrl.getAttribute('aria-required') === 'true',
              currentValue: ctrl.value || '',
              selector: '[name="' + name + '"]'
            });
          });

          return JSON.stringify({
            url: window.location.href,
            extractedAt: Date.now(),
            totalFieldsCount: allFields.length,
            allFields: allFields
          });
        })()
      `,
      returnByValue: true
    }) as { result?: { value?: string } };

    if (!res.result?.value) return null;
    const schemaData: ListingFormSchema = JSON.parse(res.result.value);

    // Save extracted schema into chrome.storage.local via storageService
    await saveFormSchema(schemaData);
    console.log(JSON.stringify(schemaData, null, 2));

    return schemaData;
  } catch (err) {
    console.error('[Schema Extractor] Failed to extract form schema:', err);
    return null;
  }
}

/**
 * Re-extracts only the pricing section subfields currently present in the DOM.
 * Call this after changing the format master dropdown.
 */
export async function extractPricingFields(debuggee: chrome.debugger.Debuggee): Promise<FormFieldSchema[]> {
  console.log('[Schema Extractor] Re-extracting Pricing sub-fields from DOM...');
  try {
    const res = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function() {
          const fields = [];
          const container = document.querySelector('.summary__price, [class*="summary__price"]');
          if (!container) return JSON.stringify(fields);

          // 1. Format
          const formatBtn = container.querySelector('.format button, button[aria-labelledby*="format"]');
          const formatNativeSelect = container.querySelector('select[name="format"]');
          if (formatBtn || formatNativeSelect) {
            fields.push({
              id: formatBtn?.id || formatNativeSelect?.id || 'format',
              name: 'format',
              label: 'Format',
              type: 'select',
              section: 'Pricing',
              required: true,
              currentValue: (formatBtn?.querySelector('.btn__text')?.textContent || formatNativeSelect?.value || '').trim(),
              options: ['Auction', 'Buy It Now'],
              selector: '.format button, select[name="format"], button[aria-labelledby*="format"]'
            });
          }

          // 2. Duration (in Auction format)
          const durationBtn = container.querySelector('button[aria-labelledby*="duration"]');
          const durationSelect = container.querySelector('select[name="duration"]');
          if (durationBtn || durationSelect) {
            fields.push({
              id: durationBtn?.id || durationSelect?.id || 'duration',
              name: 'duration',
              label: 'Auction duration',
              type: 'select',
              section: 'Pricing',
              required: false,
              currentValue: (durationBtn?.querySelector('.btn__text')?.textContent || durationSelect?.value || '').trim(),
              options: ['3 days', '5 days', '7 days', '10 days'],
              selector: 'button[aria-labelledby*="duration"], select[name="duration"]'
            });
          }

          // 3. Price inputs: startPrice, price, auctionReservePrice, quantity
          const inputs = Array.from(container.querySelectorAll('input[name="startPrice"], input[name="price"], input[name="auctionReservePrice"], input[name="quantity"]'));
          inputs.forEach(inp => {
            const labelEl = inp.closest('.se-field')?.querySelector('.field__label, label');
            const label = labelEl ? (labelEl.textContent || '').trim() : inp.name;
            fields.push({
              id: inp.id || ('price-' + inp.name),
              name: inp.name,
              label: label,
              type: 'text',
              section: 'Pricing',
              required: inp.required || inp.getAttribute('aria-required') === 'true',
              currentValue: inp.value || '',
              selector: 'input[name="' + inp.name + '"]'
            });
          });

          // 4. Checkboxes: immediatePay, bestOfferEnabled
          const checkboxes = Array.from(container.querySelectorAll('input[name="immediatePay"], input[name="bestOfferEnabled"]'));
          checkboxes.forEach(cb => {
            const labelEl = cb.closest('.se-field, .se-checkbox')?.querySelector('.field__label, label');
            const label = labelEl ? (labelEl.textContent || '').trim() : cb.name;
            fields.push({
              id: cb.id || cb.name,
              name: cb.name,
              label: label,
              type: 'checkbox',
              section: 'Pricing',
              required: false,
              currentValue: cb.checked ? 'true' : 'false',
              selector: 'input[name="' + cb.name + '"]'
            });
          });

          return JSON.stringify(fields);
        })()
      `,
      returnByValue: true
    }) as { result?: { value?: string } };

    if (!res.result?.value) return [];
    const fields: FormFieldSchema[] = JSON.parse(res.result.value);
    console.log(`[Schema Extractor] Extracted ${fields.length} Pricing fields:`, fields.map(f => f.name));
    return fields;
  } catch (err) {
    console.error('[Schema Extractor] Failed to re-extract pricing fields:', err);
    return [];
  }
}

/**
 * Re-extracts only the shipping section subfields currently present in the DOM.
 * Call this after changing the shipping method master dropdown.
 */
export async function extractShippingFields(debuggee: chrome.debugger.Debuggee): Promise<FormFieldSchema[]> {
  console.log('[Schema Extractor] Re-extracting Shipping sub-fields from DOM...');
  try {
    const res = await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
      expression: `
        (function() {
          const fields = [];
          const container = document.querySelector('.summary__shipping, [class*="summary__shipping"]');
          if (!container) return JSON.stringify(fields);

          // 1. Master shipping method
          const shipMethodBtn = container.querySelector('button[aria-labelledby*="domesticShippingType"], .summary__shipping--field button');
          const shipNativeSelect = container.querySelector('select[name="domesticShippingType"]');
          if (shipMethodBtn || shipNativeSelect) {
            fields.push({
              id: shipNativeSelect?.id || shipMethodBtn?.id || 'domesticShippingType',
              name: 'domesticShippingType',
              label: 'Shipping method',
              type: 'select',
              section: 'Shipping',
              required: true,
              currentValue: (shipMethodBtn?.querySelector('.btn__text')?.textContent || shipNativeSelect?.value || '').trim(),
              options: [
                'Standard shipping: Small to medium items',
                'Freight: Large items that require special handling',
                'No shipping. Local pickup only'
              ],
              selector: 'button[aria-labelledby*="domesticShippingType"], .summary__shipping--field button, select[name="domesticShippingType"]'
            });
          }

          // 2. Package Details: majorWeight, minorWeight, packageLength, packageWidth, packageDepth
          const shipInputs = Array.from(container.querySelectorAll('input[name="majorWeight"], input[name="minorWeight"], input[name="packageLength"], input[name="packageWidth"], input[name="packageDepth"]'));
          shipInputs.forEach(inp => {
            const labelEl = inp.closest('.se-field')?.querySelector('.field__label, label');
            const label = inp.getAttribute('aria-label') || (labelEl ? (labelEl.textContent || '').trim() : inp.name);
            fields.push({
              id: inp.id || ('shipping-' + inp.name),
              name: inp.name,
              label: label,
              type: 'text',
              section: 'Shipping',
              required: false,
              currentValue: inp.value || '',
              selector: 'input[name="' + inp.name + '"]'
            });
          });

          return JSON.stringify(fields);
        })()
      `,
      returnByValue: true
    }) as { result?: { value?: string } };

    if (!res.result?.value) return [];
    const fields: FormFieldSchema[] = JSON.parse(res.result.value);
    console.log(`[Schema Extractor] Extracted ${fields.length} Shipping fields:`, fields.map(f => f.name));
    return fields;
  } catch (err) {
    console.error('[Schema Extractor] Failed to re-extract shipping fields:', err);
    return [];
  }
}
