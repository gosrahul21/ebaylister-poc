/**
 * Generates an IIFE expression that injects the virtual CDP red pointer and mousemove listener into the DOM.
 */
export function buildVisualCursorScript(): string {
  return `
    (function() {
      if (document.getElementById('cdp-mimic-virtual-cursor')) return;
      const cursor = document.createElement('div');
      cursor.id = 'cdp-mimic-virtual-cursor';
      cursor.style.cssText = 'position:fixed;top:0;left:0;width:24px;height:24px;pointer-events:none;z-index:2147483647;transform:translate3d(-100px,-100px,0);transition:transform 0.02s linear, opacity 0.3s ease;opacity:0;';
      cursor.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 8px rgba(229,57,53,0.85));"><path d="M3 3L10.07 19.97L13.58 13.58L19.97 10.07L3 3Z" fill="#e53935" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      document.body.appendChild(cursor);

      let hideTimer;
      window.addEventListener('mousemove', function(e) {
        cursor.style.transform = 'translate3d(' + e.clientX + 'px, ' + e.clientY + 'px, 0)';
        cursor.style.opacity = '1';
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function() { cursor.style.opacity = '0'; }, 2000);
      }, { passive: true, capture: true });
    })();
  `;
}
