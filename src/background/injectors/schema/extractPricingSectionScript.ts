export function buildExtractPricingSectionScript(): string {
  return `
    (function() {
      const fields = [];
      const container = document.querySelector('.summary__price, [class*="summary__price"]');
      if (!container) return JSON.stringify(fields);

      // 1. Format
      const formatBtn = container.querySelector('.format button, button[aria-labelledby*="format"]');
      const formatNativeSelect = container.querySelector('select[name="format"]');
      if (formatBtn || formatNativeSelect) {
        fields.push({
          id: formatBtn?.id || formatNativeSelect?.id || 'format',
          name: 'format',
          label: 'Format',
          type: 'select',
          section: 'Pricing',
          required: true,
          currentValue: (formatBtn?.querySelector('.btn__text')?.textContent || formatNativeSelect?.value || '').trim(),
          options: ['Auction', 'Buy It Now'],
          selector: '.format button, select[name="format"], button[aria-labelledby*="format"]'
        });
      }

      // 2. Duration (in Auction format)
      const durationBtn = container.querySelector('button[aria-labelledby*="duration"]');
      const durationSelect = container.querySelector('select[name="duration"]');
      if (durationBtn || durationSelect) {
        fields.push({
          id: durationBtn?.id || durationSelect?.id || 'duration',
          name: 'duration',
          label: 'Auction duration',
          type: 'select',
          section: 'Pricing',
          required: false,
          currentValue: (durationBtn?.querySelector('.btn__text')?.textContent || durationSelect?.value || '').trim(),
          options: ['3 days', '5 days', '7 days', '10 days'],
          selector: 'button[aria-labelledby*="duration"], select[name="duration"]'
        });
      }

      // 3. Price inputs: startPrice, price, auctionReservePrice, quantity
      const inputs = Array.from(container.querySelectorAll('input[name="startPrice"], input[name="price"], input[name="auctionReservePrice"], input[name="quantity"]'));
      inputs.forEach(inp => {
        const labelEl = inp.closest('.se-field')?.querySelector('.field__label, label');
        const label = labelEl ? (labelEl.textContent || '').trim() : inp.name;
        fields.push({
          id: inp.id || ('price-' + inp.name),
          name: inp.name,
          label: label,
          type: 'text',
          section: 'Pricing',
          required: inp.required || inp.getAttribute('aria-required') === 'true',
          currentValue: inp.value || '',
          selector: 'input[name="' + inp.name + '"]'
        });
      });

      // 4. Checkboxes: immediatePay, bestOfferEnabled
      const checkboxes = Array.from(container.querySelectorAll('input[name="immediatePay"], input[name="bestOfferEnabled"]'));
      checkboxes.forEach(cb => {
        const labelEl = cb.closest('.se-field, .se-checkbox')?.querySelector('.field__label, label');
        const label = labelEl ? (labelEl.textContent || '').trim() : cb.name;
        fields.push({
          id: cb.id || cb.name,
          name: cb.name,
          label: label,
          type: 'checkbox',
          section: 'Pricing',
          required: false,
          currentValue: cb.checked ? 'true' : 'false',
          selector: 'input[name="' + cb.name + '"]'
        });
      });

      return JSON.stringify(fields);
    })()
  `;
}
