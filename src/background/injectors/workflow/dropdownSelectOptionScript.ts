export function buildDropdownSelectOptionScript(
  buttonSelector: string,
  value: string,
  _options: string[],
  allowCustom: boolean
): string {
  return `
    (function() {
      const btnSelector = ${JSON.stringify(buttonSelector)};
      const targetValue = ${JSON.stringify(value.trim().toLowerCase())};
      const rawTargetValue = ${JSON.stringify(value.trim())};
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

      // 2. Locate search input using specific name convention (e.g. search-box-attributesBrand) or container fallback
      const btnNameClean = (btn.getAttribute('name') || '').replace('attributes.', '').replace(/[^a-zA-Z0-9]/g, '');
      const explicitSearchSelector = btnNameClean ? 'input[name="search-box-attributes' + btnNameClean + '"]' : '';

      let searchInput = explicitSearchSelector ? (openMenu.querySelector(explicitSearchSelector) || document.querySelector(explicitSearchSelector)) : null;
      if (!searchInput) {
        searchInput = openMenu.querySelector('.se-search-box input, input[name^="search-box-"], input[type="text"], input:not([type])');
      }
      if (!searchInput && btn.closest('.fake-menu-button')) {
        searchInput = btn.closest('.fake-menu-button').querySelector('input[name^="search-box-"], .se-search-box input');
      }

      if (searchInput) {
        searchInput.focus();
        searchInput.value = rawTargetValue;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));

        const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        searchInput.dispatchEvent(enterDown);
        const enterUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        searchInput.dispatchEvent(enterUp);
      }

      // 3. Search for matching option item in the menu list and click it
      const items = Array.from(openMenu.querySelectorAll('.menu__item, [role="menuitemradio"], .filter-menu__item, [role="menuitem"], li'));
      let matched = items.find(element => {
        const txt = (element.textContent || '').trim().toLowerCase();
        return txt === targetValue || txt.includes(targetValue) || targetValue.includes(txt);
      });

      if (!matched && items.length > 0) {
        matched = items[0];
      }

      if (matched) {
        matched.scrollIntoView({ behavior: 'instant', block: 'nearest' });
        matched.click();
        matched.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return JSON.stringify({ matched: true, text: (matched.textContent || '').trim() });
      }

      return JSON.stringify({ matched: false, reason: 'no matching option item found' });
    })()
  `;
}
