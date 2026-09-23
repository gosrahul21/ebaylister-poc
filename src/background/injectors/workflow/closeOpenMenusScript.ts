export function buildCloseOpenMenusScript(): string {
  return `
    (function() {
      // 1. Clean up any inline style.display override on menu containers
      const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .fake-menu-button__menu--reverse, .filter-menu, .listbox__options, [role="listbox"]'));
      menus.forEach(m => {
        if (m.style && m.style.display) {
          m.style.removeProperty('display');
        }
      });

      // 2. Blur active element
      if (document.activeElement && document.activeElement !== document.body) {
        try { document.activeElement.blur(); } catch (e) {}
      }

      // 3. Reset aria-expanded state on trigger buttons
      const expandedButtons = Array.from(document.querySelectorAll('button[aria-expanded="true"]'));
      expandedButtons.forEach(btn => {
        btn.setAttribute('aria-expanded', 'false');
        btn.blur();
      });

      // 4. Dispatch Escape key & body click to inform framework listeners naturally
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      if (document.body) document.body.click();
    })()
  `;
}
