/**
 * Workflow injector scripts for product listing steps:
 * - Photo web preference toggle
 * - Listbox selection and coordinates
 * - Image URL input creation and coordinate calculation
 * - Dropdown and native select manipulation
 * - Immediate payment toggle
 */

export function buildTogglePhotoWebPrefScript(): string {
  return `
    (function() {
      const webSwitch = document.querySelector('input[name="photoUploadWebPref"], input[aria-label="Upload photos from web"]');
      if (!webSwitch) return JSON.stringify({ found: false });
      if (!webSwitch.checked) {
        const label = webSwitch.closest('.se-field') || webSwitch.parentElement;
        (label || webSwitch).click();
        return JSON.stringify({ found: true, toggled: true });
      }
      return JSON.stringify({ found: true, toggled: false });
    })()
  `;
}

export function buildCheckOptionSelectedScript(buttonSelector: string, optionText: string): string {
  return `
    (function() {
      const btn = document.querySelector(${JSON.stringify(buttonSelector)});
      if (!btn) return JSON.stringify({ found: false, error: 'Button not found' });

      const btnTextEl = btn.querySelector('.btn__text') || btn;
      const currentText = (btnTextEl.textContent || btn.getAttribute('value') || '').trim();
      const target = ${JSON.stringify(optionText.trim().toLowerCase())};
      
      const alreadySelected = currentText.toLowerCase() === target || 
                              currentText.toLowerCase().includes(target) || 
                              target.includes(currentText.toLowerCase());

      return JSON.stringify({
        found: true,
        currentText: currentText,
        alreadySelected: alreadySelected
      });
    })()
  `;
}

export function buildFindOptionCoordsScript(buttonSelector: string, optionText: string): string {
  return `
    (function() {
      const btn = document.querySelector(${JSON.stringify(buttonSelector)});
      const target = ${JSON.stringify(optionText.trim().toLowerCase())};

      let listbox = null;
      if (btn) {
        const controlsId = btn.getAttribute('aria-controls');
        if (controlsId) listbox = document.getElementById(controlsId);
        if (!listbox) listbox = btn.closest('.listbox-button')?.querySelector('[role="listbox"], .listbox__options');
      }

      if (!listbox) {
        const allListboxes = Array.from(document.querySelectorAll('[role="listbox"], .listbox__options'));
        listbox = allListboxes.find(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden' && m.offsetParent !== null;
        }) || allListboxes[allListboxes.length - 1];
      }

      if (!listbox) {
        return JSON.stringify({ found: false, error: 'No listbox options container found' });
      }

      const options = Array.from(listbox.querySelectorAll('[role="option"], .listbox__option'));
      let matched = options.find(opt => {
        const clone = opt.cloneNode(true);
        const clipped = clone.querySelectorAll('.clipped');
        clipped.forEach(c => c.remove());
        const text = (clone.textContent || '').trim().toLowerCase();
        return text === target || text.includes(target) || target.includes(text);
      });

      if (!matched && options.length > 0) {
        matched = options.find(opt => {
          const valEl = opt.querySelector('.listbox__value');
          const text = (valEl ? valEl.textContent : opt.textContent || '').trim().toLowerCase();
          return text === target || text.includes(target) || target.includes(text);
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

export function buildCheckUrlRowExistsScript(index: number): string {
  return `
    (function() {
      const idx = ${index};
      const modal = document.querySelector('#url-import-title')?.closest('.lightbox-dialog, .se-panel-container')
        || document.querySelector('.lightbox-dialog:not([hidden]) .se-panel-container')
        || document.querySelector('.lightbox-dialog:not([hidden])')
        || document;

      const checkRoot = (root) => {
        const urlRows = Array.from(root.querySelectorAll('.url-row'));
        if (urlRows[idx]) return true;

        const labels = Array.from(root.querySelectorAll('.floating-label label, .url-row label, label'));
        if (labels.some(l => (l.textContent || '').trim() === 'URL ' + (idx + 1))) return true;

        const allInputs = Array.from(root.querySelectorAll('input'));
        if (allInputs.some(inp => inp.id && (
          inp.id.includes('[' + idx + ']-se-textbox') ||
          (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))
        ))) return true;

        const panelBody = (root.querySelector && root.querySelector('.se-panel-container__body, .se-panel-section')) || root;
        const bodyInputs = Array.from(panelBody.querySelectorAll('input[type="text"], input.textbox__control, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'));
        return Boolean(bodyInputs[idx]);
      };

      return checkRoot(modal) || (modal !== document ? checkRoot(document) : false);
    })()
  `;
}

export function buildTargetInputCoordinatesScript(index: number): string {
  return `
    (function() {
      const idx = ${index};
      const modal = document.querySelector('#url-import-title')?.closest('.lightbox-dialog, .se-panel-container')
        || document.querySelector('.lightbox-dialog:not([hidden]) .se-panel-container')
        || document.querySelector('.lightbox-dialog:not([hidden])')
        || document;

      const findInRoot = (root) => {
        const urlRows = Array.from(root.querySelectorAll('.url-row'));
        if (urlRows[idx]) {
          const inp = urlRows[idx].querySelector('input.textbox__control, .se-textbox--input input, input[type="text"], input');
          if (inp) return inp;
        }

        const labels = Array.from(root.querySelectorAll('.floating-label label, .url-row label, label'));
        const targetLabel = labels.find(l => {
          const text = (l.textContent || '').trim();
          return text === 'URL ' + (idx + 1) || text.startsWith('URL ' + (idx + 1));
        });
        if (targetLabel) {
          if (targetLabel.getAttribute('for')) {
            const byFor = document.getElementById(targetLabel.getAttribute('for'));
            if (byFor) return byFor;
          }
          const row = targetLabel.closest('.url-row, .floating-label, .se-textbox--container');
          if (row) {
            const inp = row.querySelector('input');
            if (inp) return inp;
          }
        }

        const allInputs = Array.from(root.querySelectorAll('input'));
        const byId = allInputs.find(inp => inp.id && (
          inp.id.includes('[' + idx + ']-se-textbox') ||
          (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))
        ));
        if (byId) return byId;

        const inputs = Array.from(root.querySelectorAll('.url-row input.textbox__control, .url-row input, input.textbox__control, input[type="text"]'));
        const visibleInputs = inputs.filter(inp => {
          const style = window.getComputedStyle(inp);
          const rect = inp.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
        if (visibleInputs[idx]) return visibleInputs[idx];

        return null;
      };

      let targetInput = findInRoot(modal) || (modal !== document ? findInRoot(document) : null);

      if (!targetInput) {
        return JSON.stringify({ found: false, error: 'Target input for URL ' + (idx + 1) + ' not found' });
      }

      targetInput.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      const rect = targetInput.getBoundingClientRect();

      const paddingX = Math.max(6, Math.min(rect.width * 0.15, 24));
      const paddingY = Math.max(4, Math.min(rect.height * 0.2, 8));
      const randomX = Math.round(rect.left + paddingX + Math.random() * (rect.width - 2 * paddingX));
      const randomY = Math.round(rect.top + paddingY + Math.random() * (rect.height - 2 * paddingY));

      return JSON.stringify({
        found: true,
        randomPos: { x: randomX, y: randomY },
        id: targetInput.id || '',
        index: idx,
        dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) }
      });
    })()
  `;
}

export function buildCloseOpenMenusScript(): string {
  return `
    (function() {
      const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .fake-menu-button__menu--reverse'));
      menus.forEach(m => { m.style.display = 'none'; });
    })()
  `;
}

export function buildDropdownSelectOptionScript(
  value: string,
  options: string[],
  allowCustom: boolean
): string {
  return `
    (function() {
      const targetValue = ${JSON.stringify(value.toLowerCase())};
      const options = ${JSON.stringify(options)};
      const allowCustom = ${JSON.stringify(allowCustom)};

      const menus = Array.from(document.querySelectorAll('.fake-menu-button__menu, .filter-menu, .listbox__options, [role="listbox"]'));
      const openMenu = menus.find(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden' && m.offsetParent !== null;
      }) || menus[menus.length - 1];

      if (!openMenu) return JSON.stringify({ matched: false, reason: 'no open menu found' });

      const items = Array.from(openMenu.querySelectorAll('.menu__item, .filter-menu__item, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], li'));
      const matched = items.find(el => {
        const txt = (el.textContent || '').trim().toLowerCase();
        return txt === targetValue || txt.includes(targetValue) || targetValue.includes(txt);
      });

      if (matched) {
        matched.click();
        return JSON.stringify({ matched: true, text: (matched.textContent || '').trim() });
      }

      if (allowCustom) {
        const searchInput = openMenu.querySelector('input[type="text"], input:not([type])');
        if (searchInput) {
          searchInput.focus();
          searchInput.value = ${JSON.stringify(value)};
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          setTimeout(() => {
            const resultItems = Array.from(openMenu.querySelectorAll('.menu__item, .filter-menu__item, [role="option"], li'));
            if (resultItems.length > 0) resultItems[0].click();
          }, 300);
          return JSON.stringify({ matched: true, custom: true, text: ${JSON.stringify(value)} });
        }
      }

      return JSON.stringify({ matched: false, reason: 'no matching option and no custom input' });
    })()
  `;
}

export function buildNativeSelectOptionScript(selector: string, value: string): string {
  return `
    (function() {
      const sel = document.querySelector(${JSON.stringify(selector)});
      if (!sel) return;
      const opts = Array.from(sel.options);
      const targetVal = ${JSON.stringify(value.toLowerCase())};
      const opt = opts.find(o => o.text.toLowerCase().includes(targetVal) || o.value.toLowerCase().includes(targetVal));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `;
}

export function buildImmediatePaymentCheckboxScript(): string {
  return `
    (function() {
      const cb = document.querySelector('input[name="immediatePay"]');
      if (cb && !cb.checked) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `;
}
