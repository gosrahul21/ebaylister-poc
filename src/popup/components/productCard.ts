import { AmazonProduct } from '../../types';
import { escapeHtml } from '../utils/escapeHtml';
import { deleteProductItem, automateEbayListing } from '../services/productDataService';

export interface CardCallbacks {
  onViewProduct: (product: AmazonProduct) => void;
  onProductDeleted: () => void;
}

export function createProductCard(product: AmazonProduct, callbacks: CardCallbacks): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'product-card';

  const featuresHtml = (product.features || [])
    .slice(0, 2)
    .map(f => `<li>${escapeHtml(f.slice(0, 80))}${f.length > 80 ? '...' : ''}</li>`)
    .join('');

  card.innerHTML = `
    <div class="card-top">
      <img src="${escapeHtml(product.mainImage || 'placeholder.png')}" class="product-thumb" alt="${escapeHtml(product.title)}" />
      <div class="product-info">
        <a href="${escapeHtml(product.url)}" target="_blank" class="product-title" title="${escapeHtml(product.title)}">
          ${escapeHtml(product.title)}
        </a>
        <div class="product-meta">
          <span class="price-tag">${escapeHtml(product.price)}</span>
          <span class="asin-badge">ASIN: ${escapeHtml(product.asin)}</span>
          ${product.category ? `<span class="asin-badge category-badge">📂 ${escapeHtml(product.category)}</span>` : ''}
        </div>
      </div>
    </div>

    ${featuresHtml ? `<ul class="features-list">${featuresHtml}</ul>` : ''}

    <div class="card-actions">
      <div class="flex-gap-6">
        <button class="action-btn view" data-action="view" data-id="${product.id}">
          <span>👁️</span> Specs
        </button>
        <button class="action-btn ebay" data-action="list-ebay" data-id="${product.id}">
          <span>🏷️</span> List on eBay ↗
        </button>
      </div>
      <div class="flex-gap-4">
        <button class="action-btn" data-action="copy-json" data-id="${product.id}" title="Copy JSON">
          📋 JSON
        </button>
        <button class="action-btn delete" data-action="delete" data-id="${product.id}" title="Delete">
          🗑️
        </button>
      </div>
    </div>
  `;

  card.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!id) return;

      if (action === 'delete') {
        deleteProductItem(id, () => {
          callbacks.onProductDeleted();
        });
      } else if (action === 'view') {
        callbacks.onViewProduct(product);
      } else if (action === 'list-ebay') {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Automating...';
        automateEbayListing(product, () => {
          btn.disabled = false;
          btn.innerHTML = '<span>🏷️</span> List on eBay ↗';
        });
      } else if (action === 'copy-json') {
        navigator.clipboard.writeText(JSON.stringify(product, null, 2));
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.innerHTML = '📋 JSON'; }, 1500);
      }
    });
  });

  return card;
}
