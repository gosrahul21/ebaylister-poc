export function buildTogglePhotoWebPrefScript(): string {
  return `
    (function() {
      const webSwitch = document.querySelector('input[name="photoUploadWebPref"], input[aria-label="Upload photos from web"]');
      if (!webSwitch) return JSON.stringify({ found: false });
      if (!webSwitch.checked) {
        const label = webSwitch.closest('.se-field') || webSwitch.parentElement;
        (label || webSwitch).click();
        return JSON.stringify({ found: true, toggled: true });
      }
      return JSON.stringify({ found: true, toggled: false });
    })()
  `;
}
