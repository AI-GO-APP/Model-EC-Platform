/**
 * 示範商城 — 商品詳情頁互動邏輯
 * 從 AI GO 動態載入商品資料，配合 custom_data 中的規格資訊
 */

import '../../css/products.css';
import { addToCart, toggleWishlist, isInWishlist } from '../utils/store.js';
import { showToast } from '../components/toast.js';
import { getLang, t } from '../utils/i18n.js';
import { injectProductSchema, injectBreadcrumbSchema } from '../utils/seo.js';
import { formatPrice } from '../utils/variants.js';
import { normalizeProduct, renderProductGrid } from '../utils/product-renderer.js';
import { isLoggedIn } from '../utils/api.js';

let productData = null; // 原始 AI GO 資料
let normalizedData = null; // 標準化資料
let selectedColor = null;
let selectedSize = null;

// ============================================================
// 資料載入
// ============================================================

async function loadProduct(productId) {
  // 先嘗試 API
  try {
    if (isLoggedIn()) {
      const { proxy } = await import('../utils/api.js');
      return await proxy.get('product_templates', productId);
    }
  } catch (e) {
    console.debug('[pdp] API 載入失敗，fallback 到快取', e.message);
  }

  // 嘗試從本地快取查找
  try {
    const res = await fetch('/data/cache/product_templates.json');
    if (res.ok) {
      const all = await res.json();
      return all.find(p => p.id === productId) || null;
    }
  } catch (e) { console.debug('[pdp] 快取載入失敗', e.message); }

  return null;
}

async function loadRelatedProducts(excludeId) {
  try {
    if (isLoggedIn()) {
      const { proxy } = await import('../utils/api.js');
      const all = await proxy.list('product_templates', { limit: 50 });
      return all.filter(p => p.id !== excludeId && p.image_url && p.description_sale).slice(0, 4);
    }
  } catch (e) { console.debug('[pdp] 相關商品 API 載入失敗', e.message); }

  try {
    const res = await fetch('/data/cache/product_templates.json');
    if (res.ok) {
      const all = await res.json();
      return all.filter(p => p.id !== excludeId).slice(0, 4);
    }
  } catch (e) { console.debug('[pdp] 相關商品快取載入失敗', e.message); }

  return [];
}

// ============================================================
// 頁面渲染
// ============================================================

function renderPage() {
  if (!normalizedData) return;

  const lang = getLang();
  const cd = normalizedData.customData;

  // 頁面標題
  document.title = `${normalizedData.name} | ${t('brand.name')}`;

  // 麵包屑
  const bcName = document.getElementById('bc-product-name');
  if (bcName) bcName.textContent = normalizedData.name;

  // 商品名稱
  const nameEl = document.getElementById('pdp-name');
  if (nameEl) nameEl.textContent = normalizedData.name;

  // SKU
  const skuEl = document.getElementById('pdp-sku');
  if (skuEl) skuEl.textContent = `SKU: ${normalizedData.sku}`;

  // 價格
  const priceEl = document.getElementById('pdp-price');
  if (priceEl) {
    priceEl.innerHTML = `<span class="price" style="font-size:1.6rem;">${formatPrice(normalizedData.price, lang)}</span>`;
  }

  // 評分
  const ratingEl = document.querySelector('.pdp-info__rating');
  if (ratingEl && normalizedData.rating > 0) {
    const stars = '★'.repeat(Math.floor(normalizedData.rating)) + (normalizedData.rating % 1 >= 0.5 ? '½' : '');
    const reviewLabel = lang === 'zh-TW' ? '則評價' : 'reviews';
    ratingEl.innerHTML = `
      <span class="rating">${stars}</span>
      <span class="rating__count">(${normalizedData.reviewCount} ${reviewLabel})</span>
    `;
  }

  // 圖片
  renderGallery();

  // 顏色選項
  renderColorOptions();

  // 尺寸選項
  renderSizeOptions();

  // 庫存
  updateStockDisplay();

  // 描述
  const descContent = document.querySelector('.pdp-accordion__content p');
  if (descContent) {
    descContent.textContent = normalizedData.description;
  }

  // 材質說明
  const materialContent = document.querySelectorAll('.pdp-accordion__content')[1];
  if (materialContent) {
    const material = cd.material || '';
    const weight = cd.weight || '';
    const dimensions = cd.dimensions || '';
    let html = '';
    if (material) html += `${lang === 'zh-TW' ? '材質' : 'Material'}：${material}<br>`;
    if (weight) html += `${lang === 'zh-TW' ? '重量' : 'Weight'}：${weight}<br>`;
    if (dimensions) html += `${lang === 'zh-TW' ? '尺寸' : 'Dimensions'}：${dimensions}`;
    if (cd.capacity) html += `${lang === 'zh-TW' ? '容量' : 'Capacity'}：${cd.capacity}<br>`;
    if (cd.burn_time) html += `${lang === 'zh-TW' ? '燃燒時間' : 'Burn Time'}：${cd.burn_time}<br>`;
    if (cd.case_size) html += `${lang === 'zh-TW' ? '錶徑' : 'Case Size'}：${cd.case_size}<br>`;
    if (cd.movement) html += `${lang === 'zh-TW' ? '機芯' : 'Movement'}：${cd.movement}<br>`;
    if (cd.water_resistance) html += `${lang === 'zh-TW' ? '防水' : 'Water Resistance'}：${cd.water_resistance}`;
    if (html) materialContent.innerHTML = `<p>${html}</p>`;
  }

  // SEO
  injectProductSchema({
    id: normalizedData.id,
    name: { 'zh-TW': productData.name, en: cd.name_en || productData.name },
    description: { 'zh-TW': productData.description || '', en: cd.description_en || '' },
    brand: t('brand.name'),
    basePrice: normalizedData.price,
    rating: normalizedData.rating,
    reviewCount: normalizedData.reviewCount,
    variants: [{ price: normalizedData.price, inventory: 99 }],
  });

  injectBreadcrumbSchema([
    { name: t('nav.home'), url: '/' },
    { name: t('nav.products'), url: '/products.html' },
    { name: normalizedData.name, url: null },
  ]);
}

function renderGallery() {
  const mainImage = document.getElementById('pdp-main-image');
  const thumbsEl = document.getElementById('pdp-thumbs');
  if (!mainImage || !normalizedData) return;

  const imgUrl = normalizedData.imageUrl;
  if (imgUrl) {
    mainImage.innerHTML = `<img src="${imgUrl}" alt="${normalizedData.name}" style="width:100%;border-radius:var(--radius-lg);"/>`;
    if (thumbsEl) {
      thumbsEl.innerHTML = `<div class="pdp-thumb active"><img src="${imgUrl}" alt="thumb" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/></div>`;
    }
  }
}

function renderColorOptions() {
  const colorGroup = document.getElementById('pdp-colors');
  if (!colorGroup) return;

  const colors = normalizedData.colors;
  if (!colors || colors.length === 0) {
    colorGroup.style.display = 'none';
    return;
  }
  colorGroup.style.display = 'block';

  const lang = getLang();
  const colorLabel = lang === 'zh-TW' ? '顏色' : 'Color';
  selectedColor = selectedColor || colors[0]?.name;

  colorGroup.innerHTML = `
    <label class="pdp-option-label"><span>${colorLabel}</span>：<strong id="selected-color-name">${selectedColor}</strong></label>
    <div class="pdp-color-swatches">
      ${colors.map(c => `
        <button class="color-swatch ${c.name === selectedColor ? 'active' : ''} ${!c.available ? 'disabled' : ''}" 
                style="background:${c.hex};" data-color="${c.name}" title="${c.name}"></button>
      `).join('')}
    </div>
  `;

  // 事件
  colorGroup.querySelectorAll('.color-swatch:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.getAttribute('data-color');
      renderColorOptions();
    });
  });
}

function renderSizeOptions() {
  const sizeGroup = document.getElementById('pdp-sizes');
  if (!sizeGroup) return;

  const sizes = normalizedData.sizes;
  if (!sizes || sizes.length === 0) {
    sizeGroup.style.display = 'none';
    return;
  }
  sizeGroup.style.display = 'block';

  const lang = getLang();
  const sizeLabel = lang === 'zh-TW' ? '尺寸' : 'Size';
  selectedSize = selectedSize || sizes[0];

  sizeGroup.innerHTML = `
    <label class="pdp-option-label"><span>${sizeLabel}</span>：<strong id="selected-size-name">${selectedSize}</strong></label>
    <div class="pdp-size-options">
      ${sizes.map(s => `
        <button class="size-btn ${s === selectedSize ? 'active' : ''}" data-size="${s}">${s}</button>
      `).join('')}
    </div>
  `;

  // 事件
  sizeGroup.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSize = btn.getAttribute('data-size');
      renderSizeOptions();
    });
  });
}

function updateStockDisplay() {
  const stockEl = document.getElementById('pdp-stock');
  if (!stockEl) return;

  // 簡易庫存（之後可串 stock_quants）
  stockEl.innerHTML = `<span class="stock-status stock-status--in">${getLang() === 'zh-TW' ? '有庫存' : 'In Stock'}</span>`;
}

// ============================================================
// 事件綁定
// ============================================================

function bindEvents() {
  // 數量控制
  const qtyInput = document.getElementById('qty-input');
  document.getElementById('qty-minus')?.addEventListener('click', () => {
    if (qtyInput) qtyInput.value = Math.max(1, parseInt(qtyInput.value) - 1);
  });
  document.getElementById('qty-plus')?.addEventListener('click', () => {
    if (qtyInput) qtyInput.value = Math.min(99, parseInt(qtyInput.value) + 1);
  });

  // 加入購物車
  document.getElementById('btn-add-cart')?.addEventListener('click', () => {
    if (!normalizedData) return;
    const qty = parseInt(document.getElementById('qty-input')?.value || 1);
    const variantInfo = {
      color: selectedColor,
      size: selectedSize,
    };
    addToCart(normalizedData.id, `${normalizedData.id}-${selectedColor}-${selectedSize}`, qty, variantInfo);
    
    const lang = getLang();
    showToast(lang === 'zh-TW' ? '已加入購物車' : 'Added to cart', 'success');
    
    const btn = document.getElementById('btn-add-cart');
    btn.style.animation = 'cartBounce 0.5s ease';
    setTimeout(() => btn.style.animation = '', 500);
  });

  // 願望清單（使用頂層 ESM import，不使用 CJS require）
  document.getElementById('btn-wishlist')?.addEventListener('click', () => {
    if (!normalizedData) return;
    toggleWishlist(normalizedData.id);
    const lang = getLang();
    const inList = isInWishlist(normalizedData.id);
    showToast(
      inList
        ? (lang === 'zh-TW' ? '已加入願望清單' : 'Added to wishlist')
        : (lang === 'zh-TW' ? '已從願望清單移除' : 'Removed from wishlist'),
      'success'
    );
  });
}

// ============================================================
// 初始化
// ============================================================

async function initPDP() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    window.location.href = '/products.html';
    return;
  }

  productData = await loadProduct(productId);

  if (!productData) {
    // 商品不存在
    const layout = document.getElementById('pdp-layout');
    if (layout) {
      layout.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:4rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>${getLang() === 'zh-TW' ? '找不到此商品' : 'Product not found'}</p>
          <a href="/products.html" class="btn btn--outline" style="margin-top:1rem;">${getLang() === 'zh-TW' ? '回到商品列表' : 'Back to Products'}</a>
        </div>
      `;
    }
    return;
  }

  normalizedData = normalizeProduct(productData);
  renderPage();
  bindEvents();

  // 載入推薦商品
  const related = await loadRelatedProducts(productId);
  const relatedContainer = document.getElementById('related-products');
  if (relatedContainer && related.length > 0) {
    renderProductGrid(relatedContainer, related, { showRating: true });
  }
}

document.addEventListener('DOMContentLoaded', initPDP);
window.addEventListener('langChange', () => {
  if (normalizedData) {
    normalizedData = normalizeProduct(productData);
    renderPage();
  }
});
