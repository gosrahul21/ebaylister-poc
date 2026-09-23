export function buildNativeSelectOptionScript(selector: string, value: string): string {
  return `
    (function() {
      const sel = document.querySelector(${JSON.stringify(selector)});
      if (!sel) return;
      const opts = Array.from(sel.options);
      const targetVal = ${JSON.stringify(value.toLowerCase())};
      const option = opts.find(opt => opt.text.toLowerCase().includes(targetVal) || opt.value.toLowerCase().includes(targetVal));
      if (option) {
        sel.value = option.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `;
}
