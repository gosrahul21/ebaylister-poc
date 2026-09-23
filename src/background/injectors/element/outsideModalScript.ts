/**
 * Generates an IIFE expression that locates an open modal dialog and computes safe coordinates
 * outside of it (top-left margin) for closing it via click.
 */
export function buildClickOutsideModalScript(): string {
  return `
    (function() {
      const modal = document.querySelector('[role="dialog"], .lightbox-dialog, .modal');
      if (!modal) return JSON.stringify({ found: false });
      const rect = modal.getBoundingClientRect();
      // Find a point safely outside the modal (top left corner)
      const targetX = Math.max(10, rect.left - 50);
      const targetY = Math.max(10, rect.top - 50);
      return JSON.stringify({ found: true, x: targetX, y: targetY });
    })()
  `;
}
