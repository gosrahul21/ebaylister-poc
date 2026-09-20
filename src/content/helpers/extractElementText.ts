/**
 * Safely extracts clean human-readable text from a DOM element,
 * removing all embedded <script>, <style>, <noscript>, and CSS/JS code artifacts.
 */
export function cleanExtractElementText(el: Element | null): string {
  if (!el) return '';
  const clone = el.cloneNode(true) as Element;

  // Remove script, style, noscript, svg, iframe, form, button
  clone.querySelectorAll('script, style, noscript, svg, iframe, form, button').forEach(n => n.remove());

  // Use innerText if available (respects CSS visibility and strips raw script/style nodes)
  let text = (clone as HTMLElement).innerText || clone.textContent || '';

  // Normalize spaces
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Strip any remaining inline CSS blocks if present
  text = text.replace(/\{[^}]*\}/g, ' ');
  // Strip CSS class rules like .aplus-v2 .container { ... }
  text = text.replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, ' ');
  // Strip JS function calls like function logShoppableMetrics(...) { ... }
  text = text.replace(/function\s+[a-zA-Z0-9_$]+\s*\([^)]*\)\s*\{[^}]*\}/gi, ' ');
  // Clean header keywords if repeated
  text = text.replace(/Product description/gi, '').replace(/\s+/g, ' ').trim();

  return text;
}
