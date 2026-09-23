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
