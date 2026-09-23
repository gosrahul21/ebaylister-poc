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
