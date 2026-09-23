/**
 * Extracts all Item Specific fields dynamically from the live DOM
 * sorted strictly in exact visual UI order (top-to-bottom, left-to-right).
 */
export function buildExtractItemSpecificsInUiOrderScript(): string {
  return `
    (function() {
      const attrContainers = Array.from(document.querySelectorAll('[data-testid="attribute"], .summary__attributes--field, [class*="attribute"]'));
      
      const fields = attrContainers.map(attrEl => {
        const rect = attrEl.getBoundingClientRect();
        const labelBtn = attrEl.querySelector('.summary__attributes--label button, .summary__attributes--label label, label');
        const label = labelBtn ? (labelBtn.textContent || '').trim() : '';
        
        const fieldset = attrEl.closest('fieldset');
        const subsection = fieldset ? (fieldset.querySelector('legend h3, legend')?.textContent || '').trim() : '';

        const btn = attrEl.querySelector('button[name^="attributes."]');
        const input = attrEl.querySelector('input[name^="attributes."]');
        const pillBtns = Array.from(attrEl.querySelectorAll('.summary__attributes--pill, button[aria-pressed]'));
        const pillUl = attrEl.querySelector('.summary__attributes--value ul, ul[aria-label]');

        if (!btn && !input && pillBtns.length === 0 && !pillUl) return null;

        let name = '';
        let type = 'text';
        let options = [];
        let allowCustomValue = false;
        let selector = '';

        if (btn) {
          name = btn.getAttribute('name') || '';
          selector = 'button[name="' + name + '"]';
          const controlsId = btn.getAttribute('aria-controls');
          const menu = controlsId ? document.getElementById(controlsId) : null;

          if (menu) {
            const isMulti = menu.querySelector('[role="menuitemcheckbox"], .filter-menu__item, .filter-menu') !== null;
            type = isMulti ? 'multiselect' : 'dropdown';

            const optionEls = Array.from(menu.querySelectorAll('.menu__item span, .filter-menu__text, .filter-menu__item span, .toggle-button__title, button.toggle-button'));
            options = optionEls.map(o => (o.textContent || '').trim()).filter(Boolean);

            const searchBox = menu.querySelector('.se-search-box input, input[name^="search-box-"], input');
            const searchAttrText = searchBox ? (
              (searchBox.getAttribute('placeholder') || '') + ' ' +
              (searchBox.getAttribute('aria-label') || '') + ' ' +
              (searchBox.getAttribute('title') || '')
            ).toLowerCase() : '';
            allowCustomValue = searchAttrText.includes('enter your own') || searchAttrText.includes('or enter');
          } else {
            type = 'dropdown';
          }
        } else if (input) {
          name = input.getAttribute('name') || '';
          selector = 'input[name="' + name + '"]';
          type = 'text';
          allowCustomValue = true;
        } else if (pillBtns.length > 0 || pillUl) {
          name = 'attributes.' + label;
          type = 'pill';
          options = pillBtns.map(b => (b.textContent || '').trim()).filter(Boolean);
          if (options.length === 0) options = ['Yes', 'No'];
          selector = pillUl ? 'ul[aria-label="' + label + '"]' : '[data-testid="attribute"]';
        }

        if (!name) return null;

        return {
          id: (btn || input)?.id || ('attr-' + name),
          name: name,
          label: label || name.replace('attributes.', ''),
          type: type,
          section: 'Item specifics',
          subsection: subsection,
          options: options,
          allowCustomValue: allowCustomValue,
          selector: selector,
          top: Math.round(rect.top + window.scrollY),
          left: Math.round(rect.left + window.scrollX)
        };
      }).filter(Boolean);

      // Remove duplicates by name
      const uniqueMap = new Map();
      fields.forEach(f => {
        if (!uniqueMap.has(f.name)) {
          uniqueMap.set(f.name, f);
        }
      });
      const uniqueFields = Array.from(uniqueMap.values());

      // Sort strictly by top vertical position (with 6px row tolerance), then left horizontal position
      uniqueFields.sort((a, b) => {
        if (Math.abs(a.top - b.top) > 6) {
          return a.top - b.top;
        }
        return a.left - b.left;
      });

      return JSON.stringify(uniqueFields);
    })()
  `;
}
