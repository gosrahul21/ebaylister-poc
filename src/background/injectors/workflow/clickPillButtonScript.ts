export function buildClickPillButtonScript(label: string, optionText: string): string {
  return `
    (function() {
      const targetLabel = ${JSON.stringify(label.trim().toLowerCase())};
      const targetOption = ${JSON.stringify(optionText.trim().toLowerCase())};

      // 1. Find container by ul[aria-label]
      let ul = Array.from(document.querySelectorAll('ul[aria-label]')).find(u => 
        (u.getAttribute('aria-label') || '').trim().toLowerCase() === targetLabel
      );

      let pills = [];
      if (ul) {
        pills = Array.from(ul.querySelectorAll('.summary__attributes--pill, button[aria-pressed], button'));
      } else {
        const attrContainers = Array.from(document.querySelectorAll('[data-testid="attribute"], .summary__attributes--field'));
        for (const container of attrContainers) {
          const lBtn = container.querySelector('.summary__attributes--label button, .summary__attributes--label label, label');
          const lText = (lBtn ? lBtn.textContent : '').trim().toLowerCase();
          if (lText === targetLabel || lText.includes(targetLabel)) {
            pills = Array.from(container.querySelectorAll('.summary__attributes--pill, button[aria-pressed], button'));
            break;
          }
        }
      }

      if (pills.length === 0) {
        return JSON.stringify({ clicked: false, error: 'No pill buttons found for label: ' + targetLabel });
      }

      const matchingPill = pills.find(p => (p.textContent || '').trim().toLowerCase() === targetOption);
      if (!matchingPill) {
        return JSON.stringify({ clicked: false, error: 'No pill button found matching option: ' + targetOption });
      }

      matchingPill.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      matchingPill.click();
      matchingPill.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      return JSON.stringify({ clicked: true, text: (matchingPill.textContent || '').trim() });
    })()
  `;
}
