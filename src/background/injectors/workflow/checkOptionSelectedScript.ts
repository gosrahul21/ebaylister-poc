export function buildCheckOptionSelectedScript(buttonSelector: string, optionText: string): string {
  return `
    (function() {
      const btn = document.querySelector(${JSON.stringify(buttonSelector)});
      if (!btn) return JSON.stringify({ found: false, error: 'Button not found' });

      if (btn.tagName === 'SELECT') {
        const sel = btn;
        const currentText = (sel.options[sel.selectedIndex]?.text || sel.value || '').trim();
        const target = ${JSON.stringify(optionText.trim().toLowerCase())};
        const alreadySelected = Boolean(currentText) && (
          currentText.toLowerCase() === target || 
          currentText.toLowerCase().includes(target) || 
          (currentText.length >= 3 && target.includes(currentText.toLowerCase()))
        );
        return JSON.stringify({
          found: true,
          isNativeSelect: true,
          currentText: currentText,
          alreadySelected: alreadySelected
        });
      }

      const btnTextEl = btn.querySelector('.btn__text, .listbox-button__text, .btn__label, span') || btn;
      const currentText = (btnTextEl.textContent || btn.getAttribute('value') || '').trim();
      const target = ${JSON.stringify(optionText.trim().toLowerCase())};
      
      const alreadySelected = Boolean(currentText) && (
        currentText.toLowerCase() === target || 
        currentText.toLowerCase().includes(target) || 
        (currentText.length >= 3 && target.includes(currentText.toLowerCase()))
      );

      return JSON.stringify({
        found: true,
        isNativeSelect: false,
        currentText: currentText,
        alreadySelected: alreadySelected
      });
    })()
  `;
}
