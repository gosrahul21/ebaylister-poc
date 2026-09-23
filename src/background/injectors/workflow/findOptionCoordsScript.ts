export function buildFindOptionCoordsScript(buttonSelector: string, optionText: string): string {
  return `
    (function() {
      const btn = document.querySelector(${JSON.stringify(buttonSelector)});
      const target = ${JSON.stringify(optionText.trim().toLowerCase())};

      let listbox = null;
      if (btn) {
        const controlsId = btn.getAttribute('aria-controls');
        if (controlsId) listbox = document.getElementById(controlsId);
        if (!listbox) listbox = btn.closest('.listbox-button, .summary__price, .se-field')?.querySelector('[role="listbox"], .listbox__options, .fake-menu-button__menu');
      }

      if (!listbox) {
        const allListboxes = Array.from(document.querySelectorAll('[role="listbox"], .listbox__options, .fake-menu-button__menu'));
        listbox = allListboxes.find(menu => {
          const style = window.getComputedStyle(menu);
          return style.display !== 'none' && style.visibility !== 'hidden' && menu.offsetParent !== null;
        }) || allListboxes[allListboxes.length - 1];
      }

      if (!listbox) {
        return JSON.stringify({ found: false, error: 'No listbox options container found' });
      }

      const options = Array.from(listbox.querySelectorAll('[role="option"], .listbox__option, .menu__item, [role="menuitemradio"], [role="menuitem"], li'));
      let matched = options.find(opt => {
        const clone = opt.cloneNode(true);
        const clippedNodes = clone.querySelectorAll('.clipped');
        clippedNodes.forEach(clippedEl => clippedEl.remove());
        const text = (clone.textContent || '').trim().toLowerCase();
        return Boolean(text) && (text === target || text.includes(target) || (text.length >= 3 && target.includes(text)));
      });

      if (!matched && options.length > 0) {
        matched = options.find(opt => {
          const valEl = opt.querySelector('.listbox__value, .btn__text, span');
          const text = (valEl ? valEl.textContent : opt.textContent || '').trim().toLowerCase();
          return Boolean(text) && (text === target || text.includes(target) || (text.length >= 3 && target.includes(text)));
        });
      }

      if (!matched && options.length > 0) {
        matched = options[0];
      }

      if (!matched) {
        return JSON.stringify({ found: false, error: 'No option found matching "' + target + '"' });
      }

      matched.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
      const rect = matched.getBoundingClientRect();
      const paddingX = Math.max(4, Math.min(rect.width * 0.15, 20));
      const paddingY = Math.max(2, Math.min(rect.height * 0.2, 8));
      const randomX = Math.round(rect.left + paddingX + Math.random() * (rect.width - 2 * paddingX));
      const randomY = Math.round(rect.top + paddingY + Math.random() * (rect.height - 2 * paddingY));

      return JSON.stringify({
        found: true,
        x: randomX,
        y: randomY,
        coords: { x: randomX, y: randomY },
        text: (matched.textContent || '').trim()
      });
    })()
  `;
}
