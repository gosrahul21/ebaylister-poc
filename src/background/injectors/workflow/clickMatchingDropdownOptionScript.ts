export function buildClickMatchingDropdownOptionScript(buttonSelector: string, targetValue: string): string {
  return `
    (function() {
      const btnSelector = ${JSON.stringify(buttonSelector)};
      const target = ${JSON.stringify(targetValue.trim().toLowerCase())};

      const btn = document.querySelector(btnSelector);
      let openMenu = null;

      if (btn) {
        const controlsId = btn.getAttribute('aria-controls');
        if (controlsId) openMenu = document.getElementById(controlsId);
      }

      if (!openMenu) {
        const menus = Array.from(document.querySelectorAll('[role="menu"], [role="listbox"], .fake-menu-button__menu, .filter-menu, .se-filter-menu-button__menu-container, .se-toggle-group-menu'));
        openMenu = menus.find(menu => {
          const style = window.getComputedStyle(menu);
          return style.display !== 'none' && style.visibility !== 'hidden' && menu.offsetParent !== null;
        }) || menus[menus.length - 1];
      }

      if (!openMenu) {
        return JSON.stringify({ clicked: false, error: 'No open menu found' });
      }

      // Collect all option elements in open menu (covering dropdown menus, multiselects, toggle-buttons)
      const options = Array.from(openMenu.querySelectorAll('.menu__item, [role="menuitemradio"], [role="menuitemcheckbox"], [role="menuitem"], [role="option"], .filter-menu__item, .toggle-button, .se-toggle-button-group__toggle-button, button, li'));
      
      let matched = options.find(opt => {
        const text = (opt.textContent || opt.getAttribute('aria-label') || '').trim().toLowerCase();
        return text === target;
      });

      if (!matched) {
        matched = options.find(opt => {
          const text = (opt.textContent || opt.getAttribute('aria-label') || '').trim().toLowerCase();
          return Boolean(text) && (text.includes(target) || target.includes(text));
        });
      }

      // Fallback: if search narrowed option list down, pick the first option item
      if (!matched && options.length > 0) {
        matched = options[0];
      }

      if (!matched) {
        return JSON.stringify({ clicked: false, error: 'No matching option found for "' + target + '"' });
      }

      matched.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      matched.click();
      matched.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      return JSON.stringify({ clicked: true, text: (matched.textContent || matched.getAttribute('aria-label') || '').trim() });
    })()
  `;
}
