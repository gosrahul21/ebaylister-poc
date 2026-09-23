export function buildExtractEbayFormSchemaScript(): string {
  return `
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
      const attrFields = Array.from(document.querySelectorAll('[data-testid="attribute"], .summary__attributes--field'));
      attrFields.forEach(attrEl => {
        const labelBtn = attrEl.querySelector('.summary__attributes--label button, .summary__attributes--label label, label');
        const label = labelBtn ? (labelBtn.textContent || '').trim() : '';
        if (!label) return;

        const fieldset = attrEl.closest('fieldset');
        const subsection = fieldset ? (fieldset.querySelector('legend h3, legend')?.textContent || '').trim() : '';

        const btn = attrEl.querySelector('button[name^="attributes."]');
        const input = attrEl.querySelector('input[name^="attributes."]');
        const pillBtns = Array.from(attrEl.querySelectorAll('.summary__attributes--pill, button[aria-pressed]'));
        const pillUl = attrEl.querySelector('.summary__attributes--value ul, ul[aria-label]');

        if (btn) {
          const name = btn.getAttribute('name') || '';
          const menuId = btn.getAttribute('aria-controls');
          const menu = menuId ? document.getElementById(menuId) : null;
          const isMulti = menu ? menu.querySelector('[role="menuitemcheckbox"], .filter-menu__item, .filter-menu') !== null : false;
          const optionItems = menu ? Array.from(menu.querySelectorAll('.menu__item span, .filter-menu__text, .filter-menu__item span, .toggle-button__title, button.toggle-button')) : [];
          const options = optionItems.map(optionEl => (optionEl.textContent || '').trim()).filter(Boolean);

          const searchBox = menu ? menu.querySelector('.se-search-box input, input[name^="search-box-"], input') : null;
          const searchAttrText = searchBox ? (
            (searchBox.getAttribute('placeholder') || '') + ' ' +
            (searchBox.getAttribute('aria-label') || '') + ' ' +
            (searchBox.getAttribute('title') || '')
          ).toLowerCase() : '';
          const allowCustomValue = searchAttrText.includes('enter your own') || searchAttrText.includes('or enter');

          allFields.push({
            id: btn.id || ('attr-' + name),
            name: name,
            label: label,
            type: isMulti ? 'multiselect' : 'dropdown',
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
        } else if (pillBtns.length > 0 || pillUl) {
          const name = 'attributes.' + label;
          const options = pillBtns.map(pillBtn => (pillBtn.textContent || '').trim()).filter(Boolean);
          const currentVal = pillBtns.find(pillBtn => pillBtn.getAttribute('aria-pressed') === 'true')?.textContent?.trim() || '';
          allFields.push({
            id: 'attr-' + name,
            name: name,
            label: label,
            type: 'pill',
            section: 'Item specifics',
            subsection: subsection,
            required: attrEl.querySelector('.required-field') !== null,
            currentValue: currentVal,
            options: options.length > 0 ? options : ['Yes', 'No'],
            allowCustomValue: false,
            selector: pillUl ? 'ul[aria-label="' + label + '"]' : '[data-testid="attribute"]'
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
        if (!name || name.startsWith('search-box-') || name.endsWith('-hidden') || allFields.some(field => field.name === name)) return;
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
  `;
}
