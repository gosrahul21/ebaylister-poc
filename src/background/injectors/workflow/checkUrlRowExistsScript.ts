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
        if (labels.some(labelEl => (labelEl.textContent || '').trim() === 'URL ' + (idx + 1))) return true;

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
