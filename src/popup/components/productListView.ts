import { AmazonProduct } from '../../types';
import { createProductCard, CardCallbacks } from './productCard';

export function filterProducts(products: AmazonProduct[], query: string): AmazonProduct[] {
  if (!query) return products;
  const q = query.toLowerCase();
  return products.filter(
    p =>
      p.title.toLowerCase().includes(q) ||
      p.asin.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.categoryPath || []).some(c => c.toLowerCase().includes(q))
  );
}

export function renderProductsList(
  container: HTMLDivElement,
  products: AmazonProduct[],
  callbacks: CardCallbacks
): void {
  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-text">No Saved Products Found</div>
        <div class="empty-sub">Open an Amazon product page and click "Save Current Amazon Product" above or use the floating button!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  products.forEach(product => {
    const card = createProductCard(product, callbacks);
    container.appendChild(card);
  });
}
