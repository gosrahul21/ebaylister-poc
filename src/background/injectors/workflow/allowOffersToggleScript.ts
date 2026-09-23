export function buildAllowOffersToggleScript(allow: boolean): string {
  return `
    (function() {
      const targetState = ${JSON.stringify(allow)};

      // 1. Target main pricing section toggle first, then settings drawer preference
      let cb = document.querySelector('input[name="bestOfferEnabled"]') 
        || document.querySelector('input[name="bestOfferPref"]')
        || document.querySelector('input[name="allowOffers"]')
        || document.querySelector('input[id*="bestOfferEnabled"]')
        || document.querySelector('input[id*="allowOffers"]');

      // 2. Search by label "Allow offers" or "Best offer" if input not found directly
      if (!cb) {
        const labels = Array.from(document.querySelectorAll('label, span, div, p, button'));
        const offerLabel = labels.find(element => {
          const txt = (element.textContent || '').trim().toLowerCase();
          return txt === 'allow offers' || txt === 'best offer' || txt.startsWith('allow offers');
        });

        if (offerLabel) {
          const container = offerLabel.closest('.se-field, fieldset, section, div[class*="summary"], div[class*="offer"]') || offerLabel.parentElement;
          if (container) {
            cb = container.querySelector('input[type="checkbox"], button[role="switch"], input, .switch__control');
          }
        }
      }

      if (!cb) {
        const switches = Array.from(document.querySelectorAll('button[role="switch"], input[type="checkbox"], .switch__control'));
        cb = switches.find(s => {
          const parentText = (s.parentElement?.textContent || s.closest('div')?.textContent || '').toLowerCase();
          return parentText.includes('allow offer') || parentText.includes('best offer');
        });
      }

      if (!cb) {
        return JSON.stringify({ found: false, error: 'Allow offers switch element not found' });
      }

      // Determine current state
      let isChecked = false;
      if (cb.tagName === 'BUTTON' || cb.getAttribute('role') === 'switch') {
        isChecked = cb.checked || cb.getAttribute('aria-checked') === 'true' || cb.classList.contains('checked');
      } else {
        isChecked = cb.checked;
      }

      if (isChecked !== targetState) {
        cb.click();
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        cb.dispatchEvent(new Event('input', { bubbles: true }));
        return JSON.stringify({ found: true, toggled: true, newState: targetState });
      }

      return JSON.stringify({ found: true, toggled: false, currentState: isChecked });
    })()
  `;
}
