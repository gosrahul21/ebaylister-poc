export function buildCloseOpenMenusScript(): string {
  return `
    (function() {
      const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .fake-menu-button__menu--reverse, .filter-menu, .listbox__options, [role="listbox"]'));
      menus.forEach(menu => {
        if (menu.style && menu.style.display) {
          menu.style.removeProperty('display');
        }
      });

      if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function' && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }

      const expandedButtons = Array.from(document.querySelectorAll('button[aria-expanded="true"]'));
      expandedButtons.forEach(btn => {
        btn.setAttribute('aria-expanded', 'false');
        btn.blur();
      });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      if (document.body) document.body.click();
    })()
  `;
}
