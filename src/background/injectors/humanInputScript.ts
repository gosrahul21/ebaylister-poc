/**
 * Generates an IIFE expression that locates an input element by numeric index across photo inputs,
 * .url-row containers, or active modals, scrolls it into center, and returns its center coordinates.
 */
export function buildIndexTargetCoordsScript(index: number): string {
  return `
    (function() {
      const idx = ${index};
      const allInputs = Array.from(document.querySelectorAll('input'));
      let el = allInputs.find(inp => inp.id && (inp.id.includes('[' + idx + ']-se-textbox') || (inp.id.includes('@PHOTOS') && inp.id.includes('[' + idx + ']'))));
      if (!el) {
        const urlRows = Array.from(document.querySelectorAll('.url-row'));
        if (urlRows[idx]) el = urlRows[idx].querySelector('input.textbox__control, input');
      }
      if (!el) {
        const modal = document.querySelector('[role="dialog"], .lightbox-dialog, .modal') || document.body;
        const visible = Array.from(modal.querySelectorAll('.url-row input, input.textbox__control, input[type="text"], input:not([type]), input')).filter(inp => {
          const style = window.getComputedStyle(inp);
          const rect = inp.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && inp.offsetParent !== null && rect.width > 0 && rect.height > 0;
        });
        el = visible[idx] || visible[visible.length - 1];
      }
      if (!el) return JSON.stringify({ found: false });
      el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      const rect = el.getBoundingClientRect();
      return JSON.stringify({
        found: true,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      });
    })()
  `;
}
