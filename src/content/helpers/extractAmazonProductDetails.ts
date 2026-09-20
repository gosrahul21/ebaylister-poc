import { AmazonProduct } from "@/types";
import { cleanExtractElementText } from "./extractElementText";

/**
 * Amazon Product Details Scraper
 * Extracts all visible product details from any Amazon product details page.
 */
export function extractAmazonProductDetails(): AmazonProduct | null {
  // 1. Extract ASIN
  let asin = '';
  const asinInput = document.querySelector<HTMLInputElement>('input#ASIN, input[name="ASIN"]');
  if (asinInput && asinInput.value) {
    asin = asinInput.value.trim();
  }

  if (!asin) {
    const urlMatch = window.location.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (urlMatch) {
      asin = urlMatch[1].toUpperCase();
    }
  }

  if (!asin) {
    const dataAsin = document.querySelector('[data-asin]');
    if (dataAsin instanceof HTMLElement && dataAsin.dataset.asin) {
      asin = dataAsin.dataset.asin.trim();
    }
  }

  // 2. Extract Title
  let title = '';
  const titleSelectors = [
    '#productTitle',
    '#title',
    '#productTitle_feature_div h1',
    '#titleSection h1',
    'h1.a-size-large',
    'span#productTitle',
    'h1'
  ];
  for (const sel of titleSelectors) {
    const titleEl = document.querySelector(sel);
    if (titleEl && titleEl.textContent?.trim()) {
      const candidateText = titleEl.textContent.trim().replace(/\s+/g, ' ');
      if (candidateText.length > 3 && !candidateText.toLowerCase().includes('amazon.com') && !candidateText.toLowerCase().includes('amazon.in')) {
        title = candidateText;
        break;
      } else if (!title && candidateText.length > 3) {
        title = candidateText;
      }
    }
  }

  // Fallback to document.title if element-specific title is not found
  if (!title && document.title) {
    title = document.title
      .replace(/^Amazon\.[a-z.]+:?\s*/i, '')
      .replace(/:\s*Amazon\.[a-z.]+$/i, '')
      .trim();
  }

  if (!title) {
    title = 'Amazon Product';
  }

  // 3. Extract Price
  let price = '';

  const priceSelectors = [
    // '.apexPriceToPay .a-offscreen',
    // '#corePrice_feature_div .a-offscreen',
    '.a-price .a-offscreen',
    // '#priceblock_ourprice',
    // '#priceblock_dealprice',
    // '#price_inside_buybox',
    // '.priceToPay .a-offscreen'
  ];

  for (const selector of priceSelectors) {
    const priceEl = document.querySelector(selector);
    if (priceEl && priceEl.textContent?.trim()) {
      price = priceEl.textContent.trim();
      break;
    }
  }
  let priceSymbol, priceWhole, priceFraction;
  if (!price) {
     priceSymbol = document.querySelector('.a-price-symbol');
     priceWhole = document.querySelector('.a-price-whole');
     priceFraction = document.querySelector('.a-price-fraction');
    if (priceWhole && priceWhole.textContent) {
      const sym = priceSymbol?.textContent?.trim() || '$';
      const frac = priceFraction?.textContent?.trim() || '00';
      price = `${sym}${priceWhole.textContent.replace('.', '').trim()}.${frac}`;
    }
  }

  // 4. Extract Brand
  let brand = '';
  const brandEl = document.querySelector('#bylineInfo, #bylineInfo_feature_div a, #brand');
  if (brandEl) {
    brand = brandEl.textContent?.trim().replace(/^(Visit the|Brand:)\s*/i, '') || '';
  }

  // 4.5. Extract Category Path from Wayfinding Breadcrumbs
  const categoryPath: string[] = [];
  const breadcrumbEls = document.querySelectorAll(
    '#wayfinding-breadcrumbs_feature_div ul li a, .a-breadcrumb ul li a, #wayfinding-breadcrumbs_feature_div li a'
  );
  console.log({breadcrumbEls})
  breadcrumbEls.forEach(el => {
    const text = el.textContent?.trim();
    if (text && text !== '›' && text !== '>' && !text.includes('Back to results')) {
      categoryPath.push(text);
    }
  });

  // 5. Extract Rating & Review Count
  let rating = '';
  const ratingEl = document.querySelector('#acrPopover .a-icon-alt, #averageCustomerReviews .a-icon-alt');
  if (ratingEl) {
    rating = ratingEl.textContent?.trim() || '';
  }

  let reviewCount = '';
  const reviewCountEl = document.querySelector('#acrCustomerReviewText, #acrCustomerReviewLink');
  if (reviewCountEl) {
    reviewCount = reviewCountEl.textContent?.trim() || '';
  }

  // 6. Extract Images (Main + Gallery)
  let mainImage = '';
  const mainImgEl = document.querySelector<HTMLImageElement>(
    '#landingImage, #imgBlkFront, #main-image-container img, #ebooksImgBlkFront'
  );
  if (mainImgEl && mainImgEl.src && !mainImgEl.src.startsWith('data:')) {
    mainImage = extractAmazonProductImageUrls(mainImgEl.src);
  }

  const imageSet = new Set<string>();
  if (mainImage) imageSet.add(mainImage);

  // Gallery thumbnails
  const thumbImgs = document.querySelectorAll<HTMLImageElement>(
    '#altImages img, #imageBlock img, #main-image-container img, .imageThumbnail img'
  );
  thumbImgs.forEach(img => {
    const src = img.src || img.dataset.oldHires || img.dataset.aDynamicImage;
    if (src && typeof src === 'string' && !src.startsWith('data:') && !src.includes('sprite')) {
      const highRes = extractAmazonProductImageUrls(src);
      if (highRes) imageSet.add(highRes);
    }
  });

  const images = Array.from(imageSet).slice(0, 10); // Store up to top 10 images

  // 7. Extract Feature Bullets
  const features: string[] = [];
  const bulletEls = document.querySelectorAll(
    '#feature-bullets ul li span.a-list-item, #featurebullets_feature_div ul li span.a-list-item'
  );
  bulletEls.forEach(el => {
    const text = el.textContent?.trim();
    if (text && !text.includes('Make sure this fits') && text.length > 3) {
      features.push(text);
    }
  });

  // 8. Extract Description cleanly
  let description = '';

  // Try paragraphs inside #productDescription first (most clean human text)
  const descParagraphs = document.querySelectorAll('#productDescription p, #productDescription span');
  if (descParagraphs.length > 0) {
    const pTexts: string[] = [];
    descParagraphs.forEach(p => {
      const cleanP = cleanExtractElementText(p);
      if (cleanP && cleanP.length > 5 && !cleanP.startsWith('.')) {
        pTexts.push(cleanP);
      }
    });
    description = pTexts.join('\n\n');
  }

  if (!description) {
    const descEl = document.querySelector('#productDescription, #productDescription_feature_div');
    description = cleanExtractElementText(descEl);
  }

  if (!description) {
    const aplusEl = document.querySelector('#aplus_feature_div, #aplus, .aplus-v2');
    description = cleanExtractElementText(aplusEl);
  }

  // Cap description to 2500 chars to avoid memory overhead
  if (description.length > 2500) {
    description = description.slice(0, 2500) + '...';
  }

  // 9. Extract Specifications Table / Tech Specs
  const specifications: Record<string, string> = {};

  // Table spec format (#productDetails_techSpec_section_1, .prodDetTable)
  const specRows = document.querySelectorAll(
    '#productDetails_techSpec_section_1 tr, .prodDetTable tr, #technicalSpecifications_section_1 tr'
  );
  specRows.forEach(row => {
    const label = row.querySelector('th')?.textContent?.trim();
    const val = row.querySelector('td')?.textContent?.trim();
    if (label && val) {
      specifications[cleanSpecLabel(label)] = val;
    }
  });

  // Detail bullets spec format (#detailBullets_feature_div li)
  if (Object.keys(specifications).length === 0) {
    const detailBullets = document.querySelectorAll('#detailBullets_feature_div li span.a-list-item');
    detailBullets.forEach(item => {
      const text = item.textContent?.trim() || '';
      const parts = text.split(/:\u200e|:/);
      if (parts.length >= 2) {
        const key = cleanSpecLabel(parts[0]);
        const val = parts.slice(1).join(':').trim();
        if (key && val) {
          specifications[key] = val;
        }
      }
    });
  }

  // 10. Extract Availability
  let availability = 'In Stock';
  const availEl = document.querySelector('#availability span, #availability');
  if (availEl && availEl.textContent?.trim()) {
    availability = availEl.textContent.trim().replace(/\s+/g, ' ');
  }

  return {
    id: `${asin || 'AMZ'}_${Date.now()}`,
    asin: asin || 'N/A',
    title,
    price: price || 'N/A',
    brand: brand || 'Amazon',
    rating: rating || 'No rating',
    reviewCount: reviewCount || '0 reviews',
    mainImage: mainImage || (images[0] ?? ''),
    images,
    url: window.location.href,
    availability,
    features,
    description,
    specifications,
    category: categoryPath.length > 0 ? categoryPath[categoryPath.length - 1] : 'Uncategorized',
    categoryPath,
    savedAt: Date.now()
  };
}


/** Converts Amazon thumbnail image URLs to high-resolution image URLs */
function extractAmazonProductImageUrls(url: string): string {
  if (!url) return '';
  // Removes resolution modifiers like ._AC_SR38,50_.jpg or ._SX450_.jpg
  return url.replace(/\._[A-Z0-9_,-]+_\.(jpg|jpeg|png|webp|gif)/i, '.$1');
}


function cleanSpecLabel(label: string): string {
  return label.replace(/[\u200E\u200F\t\n\r]/g, '').trim();
}