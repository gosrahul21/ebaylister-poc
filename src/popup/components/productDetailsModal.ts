import { AmazonProduct } from '../../types';
import { escapeHtml } from '../utils/escapeHtml';

export interface DetailsModalUI {
  detailsModal: HTMLDivElement;
  closeModalBtn: HTMLButtonElement;
  modalProductAsin: HTMLHeadingElement;
  modalBodyContent: HTMLDivElement;
}

export function initProductDetailsModal(ui: DetailsModalUI): { openProductModal: (product: AmazonProduct) => void } {
  function openProductModal(product: AmazonProduct): void {
    ui.modalProductAsin.textContent = `ASIN: ${product.asin} — Product Details`;

    const imagesHtml = (product.images && product.images.length > 0 ? product.images : [product.mainImage])
      .filter(Boolean)
      .map(img => `<img src="${escapeHtml(img)}" alt="Product Photo" />`)
      .join('');

    const specsRowsHtml = Object.entries(product.specifications || {})
      .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
      .join('');

    const featuresListHtml = (product.features || [])
      .map(f => `<li>${escapeHtml(f)}</li>`)
      .join('');

    const categoryBreadcrumbsHtml = product.categoryPath && product.categoryPath.length > 0
      ? product.categoryPath.map(escapeHtml).join(' &nbsp;›&nbsp; ')
      : escapeHtml(product.category || 'Uncategorized');

    ui.modalBodyContent.innerHTML = `
      <div class="modal-header-hero">
        <img src="${escapeHtml(product.mainImage)}" class="modal-hero-img" />
        <div>
          <h3 class="modal-hero-title">${escapeHtml(product.title)}</h3>
          <div class="modal-hero-price">
            ${escapeHtml(product.price)} · ${escapeHtml(product.brand)} · ${escapeHtml(product.availability)}
          </div>
        </div>
      </div>

      <div>
        <div class="modal-section-label">Category Hierarchy (Breadcrumbs)</div>
        <div class="modal-breadcrumbs-box">
          📂 ${categoryBreadcrumbsHtml}
        </div>
      </div>

      ${imagesHtml ? `
        <div>
          <div class="modal-section-label">
            Saved Product Images (${(product.images || []).length})
          </div>
          <div class="modal-gallery">${imagesHtml}</div>
        </div>
      ` : ''}

      ${featuresListHtml ? `
        <div>
          <div class="modal-section-label">Key Features</div>
          <ul class="modal-features-list">
            ${featuresListHtml}
          </ul>
        </div>
      ` : ''}

      ${specsRowsHtml ? `
        <div>
          <div class="modal-section-label">Product Specifications</div>
          <table class="spec-table">
            <tbody>${specsRowsHtml}</tbody>
          </table>
        </div>
      ` : ''}

      ${product.description ? `
        <div>
          <div class="modal-section-label">Description</div>
          <div class="modal-description-box">
            ${escapeHtml(product.description)}
          </div>
        </div>
      ` : ''}
    `;

    ui.detailsModal.classList.add('active');
  }

  ui.closeModalBtn.addEventListener('click', () => {
    ui.detailsModal.classList.remove('active');
  });

  ui.detailsModal.addEventListener('click', e => {
    if (e.target === ui.detailsModal) {
      ui.detailsModal.classList.remove('active');
    }
  });

  return { openProductModal };
}
