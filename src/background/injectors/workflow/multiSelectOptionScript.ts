export function buildMultiSelectOptionScript(
  buttonSelector: string,
  values: string[],
  allowCustom: boolean
): string {
  return `
    (function() {
      const btnSelector = ${JSON.stringify(buttonSelector)};
      const targetValues = ${JSON.stringify(values.map(val => val.trim()))};
      const allowCustom = ${JSON.stringify(allowCustom)};

      const btn = document.querySelector(btnSelector);
      if (!btn) return JSON.stringify({ matched: false, reason: 'button not found: ' + btnSelector });

      // 1. Ensure dropdown button is opened
      if (btn.getAttribute('aria-expanded') !== 'true') {
        btn.click();
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }

      const controlsId = btn.getAttribute('aria-controls');
      let openMenu = controlsId ? document.getElementById(controlsId) : null;
      if (!openMenu) {
        openMenu = btn.closest('.fake-menu-button')?.querySelector('.fake-menu-button__menu, .se-filter-menu-button__menu-container');
      }

      if (!openMenu) {
        const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .filter-menu, .listbox__options, [role="listbox"]'));
        openMenu = menus.find(menu => {
          const style = window.getComputedStyle(menu);
          return style.display !== 'none' && style.visibility !== 'hidden' && menu.offsetParent !== null;
        }) || menus[menus.length - 1];
      }

      if (!openMenu) return JSON.stringify({ matched: false, reason: 'no open menu found' });

      if (openMenu.style && openMenu.style.display) {
        openMenu.style.removeProperty('display');
      }

      const btnNameClean = (btn.getAttribute('name') || '').replace('attributes.', '').replace(/[^a-zA-Z0-9]/g, '');
      const explicitSearchSelector = btnNameClean ? 'input[name="search-box-attributes' + btnNameClean + '"]' : '';

      let searchInput = explicitSearchSelector ? (openMenu.querySelector(explicitSearchSelector) || document.querySelector(explicitSearchSelector)) : null;
      if (!searchInput) {
        searchInput = openMenu.querySelector('.se-search-box input, input[name^="search-box-"], input[type="text"], input:not([type])');
      }
      if (!searchInput && btn.closest('.fake-menu-button')) {
        searchInput = btn.closest('.fake-menu-button').querySelector('input[name^="search-box-"], .se-search-box input');
      }

      let checkedCount = 0;
      const matchedTexts = [];

      // 2. Process each target value
      for (const rawVal of targetValues) {
        if (!rawVal) continue;
        const lowerVal = rawVal.toLowerCase();

        // Focus search box input, type item value, and press Enter
        if (searchInput) {
          searchInput.focus();
          searchInput.value = rawVal;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));

          const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
          searchInput.dispatchEvent(enterDown);
          const enterUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
          searchInput.dispatchEvent(enterUp);
        }

        // Find option in items list
        const items = Array.from(openMenu.querySelectorAll('.filter-menu__item, [role="menuitemcheckbox"], .menu__item, [role="menuitem"]'));
        let matched = items.find(element => {
          const txtEl = element.querySelector('.filter-menu__text') || element;
          const txt = (txtEl.textContent || element.textContent || '').trim().toLowerCase();
          return txt === lowerVal || txt.includes(lowerVal) || lowerVal.includes(txt);
        });

        if (!matched && items.length > 0 && searchInput && searchInput.value) {
          matched = items[0];
        }

        if (matched) {
          matched.scrollIntoView({ behavior: 'instant', block: 'nearest' });
          const isChecked = matched.getAttribute('aria-checked') === 'true' || matched.classList.contains('is-selected');
          if (!isChecked) {
            matched.click();
            matched.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          }
          checkedCount++;
          matchedTexts.push((matched.textContent || '').trim());
        }

        // Clear search box for next item
        if (searchInput) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      return JSON.stringify({
        matched: checkedCount > 0,
        checkedCount: checkedCount,
        matchedTexts: matchedTexts
      });
    })()
  `;
}
