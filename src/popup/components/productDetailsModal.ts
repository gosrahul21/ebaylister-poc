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
      <div style="display:flex; gap: 12px; align-items: center;">
        <img src="${escapeHtml(product.mainImage)}" style="width: 80px; height: 80px; object-fit: contain; background: #fff; padding: 4px; border-radius: 8px;" />
        <div>
          <h3 style="font-size: 13px; font-weight: 700; color: #fff; line-height: 1.4;">${escapeHtml(product.title)}</h3>
          <div style="margin-top: 4px; font-size: 12px; color: #ff9900; font-weight: 800;">
            ${escapeHtml(product.price)} · ${escapeHtml(product.brand)} · ${escapeHtml(product.availability)}
          </div>
        </div>
      </div>

      <div>
        <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Category Hierarchy (Breadcrumbs)</div>
        <div style="font-size: 11.5px; color: #38bdf8; background: rgba(56, 189, 248, 0.08); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2);">
          📂 ${categoryBreadcrumbsHtml}
        </div>
      </div>

      ${imagesHtml ? `
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">
            Saved Product Images (${(product.images || []).length})
          </div>
          <div class="modal-gallery">${imagesHtml}</div>
        </div>
      ` : ''}

      ${featuresListHtml ? `
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Key Features</div>
          <ul style="padding-left: 18px; font-size: 11.5px; color: #cbd5e1; display: flex; flex-direction: column; gap: 4px;">
            ${featuresListHtml}
          </ul>
        </div>
      ` : ''}

      ${specsRowsHtml ? `
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Product Specifications</div>
          <table class="spec-table">
            <tbody>${specsRowsHtml}</tbody>
          </table>
        </div>
      ` : ''}

      ${product.description ? `
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Description</div>
          <div style="font-size: 11.5px; color: #94a3b8; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
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
