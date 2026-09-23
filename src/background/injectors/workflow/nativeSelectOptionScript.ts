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
