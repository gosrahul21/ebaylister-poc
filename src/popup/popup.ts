import { AmazonProduct, ExtensionAction, ExtensionResponse } from '../types';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const countBadge = document.getElementById('count-badge') as HTMLDivElement;
  const bannerDot = document.getElementById('banner-dot') as HTMLDivElement;
  const bannerStatusText = document.getElementById('banner-status-text') as HTMLSpanElement;
  const saveCurrentBtn = document.getElementById('save-current-btn') as HTMLButtonElement;
  const saveBtnText = document.getElementById('save-btn-text') as HTMLSpanElement;
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const productsList = document.getElementById('products-list') as HTMLDivElement;
  const exportJsonBtn = document.getElementById('export-json-btn') as HTMLButtonElement;
  const clearAllBtn = document.getElementById('clear-all-btn') as HTMLButtonElement;

  // Modal elements
  const detailsModal = document.getElementById('details-modal') as HTMLDivElement;
  const closeModalBtn = document.getElementById('close-modal-btn') as HTMLButtonElement;
  const modalProductAsin = document.getElementById('modal-product-asin') as HTMLHeadingElement;
  const modalBodyContent = document.getElementById('modal-body-content') as HTMLDivElement;

  let allProducts: AmazonProduct[] = [];
  let activeProductToSave: AmazonProduct | null = null;

  // ── 1. Check Active Tab & Enable Save Action ─────────────────────────────
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab || !tab.id || !tab.url) {
      setTabBanner(false, 'No active web page detected.');
      return;
    }

    const isAmazon = tab.url.includes('amazon.');

    if (!isAmazon) {
      setTabBanner(false, 'Not an Amazon page (Open an Amazon product page to save details).');
      return;
    }

    setTabBanner(true, 'Amazon page detected. Fetching details...');

    // Request scraped product details from content script
    chrome.tabs.sendMessage(
      tab.id,
      { action: ExtensionAction.SCRAPE_AMAZON_PRODUCT },
      (response: ExtensionResponse) => {
        if (chrome.runtime.lastError || !response || !response.success || !response.product) {
          // Fallback: inject content script if not ready or try scraping
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id! },
              files: ['content.js']
            },
            () => {
              // Retry scrape request
              chrome.tabs.sendMessage(
                tab.id!,
                { action: ExtensionAction.SCRAPE_AMAZON_PRODUCT },
                (retryRes: ExtensionResponse) => {
                  if (retryRes && retryRes.success && retryRes.product) {
                    activeProductToSave = retryRes.product;
                    setTabBanner(true, `Ready to save "${retryRes.product.title.slice(0, 32)}..."`, true);
                  } else {
                    setTabBanner(false, 'Amazon page detected, but not on a product details page.');
                  }
                }
              );
            }
          );
          return;
        }

        activeProductToSave = response.product;
        setTabBanner(true, `Ready to save "${response.product.title.slice(0, 32)}..."`, true);
      }
    );
  });

  function setTabBanner(isAmazon: boolean, message: string, readyToSave = false): void {
    bannerDot.className = isAmazon ? 'pulse-dot' : 'pulse-dot off';
    bannerStatusText.textContent = message;
    saveCurrentBtn.disabled = !readyToSave;
    saveBtnText.textContent = readyToSave ? 'Save Current Amazon Product' : 'Save Current Product';
  }

  // ── 2. Save Current Product ──────────────────────────────────────────────
  saveCurrentBtn.addEventListener('click', () => {
    if (!activeProductToSave) return;

    saveCurrentBtn.disabled = true;
    saveBtnText.textContent = 'Saving product details...';

    chrome.runtime.sendMessage(
      { action: ExtensionAction.SAVE_AMAZON_PRODUCT, product: activeProductToSave },
      (res: ExtensionResponse) => {
        saveCurrentBtn.disabled = false;
        saveBtnText.textContent = 'Save Current Amazon Product';

        if (res && res.success) {
          loadSavedProducts();
        } else {
          alert(`Error saving product: ${res?.error || 'Unknown error'}`);
        }
      }
    );
  });

  // ── 3. Load & Render Saved Products ──────────────────────────────────────
  function loadSavedProducts(): void {
    chrome.runtime.sendMessage({ action: ExtensionAction.GET_SAVED_PRODUCTS }, (res: ExtensionResponse) => {
      if (res && res.success && res.products) {
        allProducts = res.products;
        updateBadgeCount(allProducts.length);
        renderProductsList(filterProducts(allProducts, searchInput.value.trim()));
      }
    });
  }

  function updateBadgeCount(count: number): void {
    countBadge.textContent = `${count} Saved`;
  }

  function filterProducts(products: AmazonProduct[], query: string): AmazonProduct[] {
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

  searchInput.addEventListener('input', () => {
    renderProductsList(filterProducts(allProducts, searchInput.value.trim()));
  });

  function renderProductsList(products: AmazonProduct[]): void {
    if (products.length === 0) {
      productsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <div class="empty-text">No Saved Products Found</div>
          <div class="empty-sub">Open an Amazon product page and click "Save Current Amazon Product" above or use the floating button!</div>
        </div>
      `;
      return;
    }

    productsList.innerHTML = '';

    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';

      // Top 2 features
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
              ${product.category ? `<span class="asin-badge" style="color: #38bdf8; background: rgba(56, 189, 248, 0.1);">📂 ${escapeHtml(product.category)}</span>` : ''}
            </div>
          </div>
        </div>

        ${featuresHtml ? `<ul class="features-list">${featuresHtml}</ul>` : ''}

        <div class="card-actions">
          <div style="display:flex; gap: 6px; flex: 1;">
            <button class="action-btn view" data-action="view" data-id="${product.id}">
              <span>👁️</span> Specs
            </button>
            <button class="action-btn ebay" data-action="list-ebay" data-id="${product.id}">
              <span>🏷️</span> List on eBay ↗
            </button>
          </div>
          <div style="display:flex; gap: 4px;">
            <button class="action-btn" data-action="copy-json" data-id="${product.id}" title="Copy JSON">
              📋 JSON
            </button>
            <button class="action-btn delete" data-action="delete" data-id="${product.id}" title="Delete">
              🗑️
            </button>
          </div>
        </div>
      `;

      // Attach card listeners
      card.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          if (!id) return;

          if (action === 'delete') {
            deleteProductItem(id);
          } else if (action === 'view') {
            openProductModal(product);
          } else if (action === 'list-ebay') {
            const categoryQuery = product.categoryPath && product.categoryPath.length > 0
              ? product.categoryPath
              : (product.category || product.title);

            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span> Automating...';

            chrome.runtime.sendMessage(
              { action: ExtensionAction.AUTOMATE_EBAY_LISTING, categoryQuery, product: product },
              (_res: ExtensionResponse) => {
                setTimeout(() => {
                  btn.disabled = false;
                  btn.innerHTML = '<span>🏷️</span> List on eBay ↗';
                }, 1500);
              }
            );
          } else if (action === 'copy-json') {
            navigator.clipboard.writeText(JSON.stringify(product, null, 2));
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.innerHTML = '📋 JSON'; }, 1500);
          }
        });
      });

      productsList.appendChild(card);
    });
  }

  function deleteProductItem(id: string): void {
    chrome.runtime.sendMessage({ action: ExtensionAction.DELETE_SAVED_PRODUCT, id }, (res: ExtensionResponse) => {
      if (res && res.success) {
        loadSavedProducts();
      }
    });
  }

  // ── 4. Product Details Modal ──────────────────────────────────────────────
  function openProductModal(product: AmazonProduct): void {
    modalProductAsin.textContent = `ASIN: ${product.asin} — Product Details`;

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

    modalBodyContent.innerHTML = `
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

    detailsModal.classList.add('active');
  }

  closeModalBtn.addEventListener('click', () => {
    detailsModal.classList.remove('active');
  });

  detailsModal.addEventListener('click', e => {
    if (e.target === detailsModal) {
      detailsModal.classList.remove('active');
    }
  });

  // ── 5. Clear All & Export JSON ───────────────────────────────────────────
  clearAllBtn.addEventListener('click', () => {
    if (allProducts.length === 0) return;
    if (confirm('Are you sure you want to delete ALL saved Amazon products?')) {
      chrome.runtime.sendMessage({ action: ExtensionAction.CLEAR_ALL_SAVED_PRODUCTS }, () => {
        loadSavedProducts();
      });
    }
  });

  exportJsonBtn.addEventListener('click', () => {
    if (allProducts.length === 0) {
      alert('No saved products to export.');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allProducts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `amazon_saved_products_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  function escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  loadSavedProducts();
});
