export function buildExtractShippingSectionScript(): string {
  return `
    (function() {
      const fields = [];
      const container = document.querySelector('.summary__shipping, [class*="summary__shipping"]');
      if (!container) return JSON.stringify(fields);

      // 1. Master shipping method
      const shipMethodBtn = container.querySelector('button[aria-labelledby*="domesticShippingType"], .summary__shipping--field button');
      const shipNativeSelect = container.querySelector('select[name="domesticShippingType"]');
      if (shipMethodBtn || shipNativeSelect) {
        fields.push({
          id: shipNativeSelect?.id || shipMethodBtn?.id || 'domesticShippingType',
          name: 'domesticShippingType',
          label: 'Shipping method',
          type: 'select',
          section: 'Shipping',
          required: true,
          currentValue: (shipMethodBtn?.querySelector('.btn__text')?.textContent || shipNativeSelect?.value || '').trim(),
          options: [
            'Standard shipping: Small to medium items',
            'Freight: Large items that require special handling',
            'No shipping. Local pickup only'
          ],
          selector: 'button[aria-labelledby*="domesticShippingType"], .summary__shipping--field button, select[name="domesticShippingType"]'
        });
      }

      // 2. Package Details: majorWeight, minorWeight, packageLength, packageWidth, packageDepth
      const shipInputs = Array.from(container.querySelectorAll('input[name="majorWeight"], input[name="minorWeight"], input[name="packageLength"], input[name="packageWidth"], input[name="packageDepth"]'));
      shipInputs.forEach(inp => {
        const labelEl = inp.closest('.se-field')?.querySelector('.field__label, label');
        const label = inp.getAttribute('aria-label') || (labelEl ? (labelEl.textContent || '').trim() : inp.name);
        fields.push({
          id: inp.id || ('shipping-' + inp.name),
          name: inp.name,
          label: label,
          type: 'text',
          section: 'Shipping',
          required: false,
          currentValue: inp.value || '',
          selector: 'input[name="' + inp.name + '"]'
        });
      });

      return JSON.stringify(fields);
    })()
  `;
}
