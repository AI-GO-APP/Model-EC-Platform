/**
 * 示範商城 — 商品卡片渲染器
 * 將 AI GO product_templates 資料渲染為統一的商品卡片 HTML
 * 
 * 支援兩種資料來源：
 * 1. AI GO product_templates（含 custom_data 雙語欄位）
 * 2. 本地 JSON 快取（public/data/cache/product_templates.json）
 */

import { getLang } from './i18n.js';
import { formatPrice } from './variants.js';

/**
 * 從 AI GO product_template 物件提取顯示資訊
 * @param {Object} p - product_template 記錄
 * @returns {Object} 標準化的商品顯示資料
 */
export function normalizeProduct(p) {
  const lang = getLang();
  const cd = p.custom_data || {};

  // 名稱
  const name = lang === 'en' && cd.name_en ? cd.name_en : p.name;

  // 描述
  const description = lang === 'en' && cd.description_en 
    ? cd.description_en 
    : (p.description || p.description_sale || '');

  // 分類標籤
  const category = lang === 'en' && cd.category_en ? cd.category_en : (cd.category_display || '');

  // 標籤（轉換為 badge 類型）
  const tagMap = {
    '新品': { cls: 'badge--new', en: 'NEW' },
    '熱銷': { cls: 'badge--bestseller', en: 'BEST' },
    '精選': { cls: 'badge--featured', en: 'PICK' },
    '手作': { cls: 'badge--handmade', en: 'CRAFT' },
    '限量': { cls: 'badge--limited', en: 'LIMITED' },
    '送禮推薦': { cls: 'badge--gift', en: 'GIFT' },
  };
  const tags = (cd.tags || []).map(t => ({
    cls: tagMap[t]?.cls || 'badge--default',
    label: lang === 'en' ? (tagMap[t]?.en || t) : t,
  }));

  // 顏色
  const colors = cd.colors || [];
  // 尺寸
  const sizes = cd.sizes || [];
  // 評分
  const rating = cd.rating || 0;
  const reviewCount = cd.review_count || 0;

  return {
    id: p.id,
    name,
    description,
    descriptionSale: p.description_sale || '',
    category,
    price: p.list_price || 0,
    standardPrice: p.standard_price || 0,
    sku: p.default_code || '',
    imageUrl: p.image_url || '',
    tags,
    colors,
    sizes,
    rating,
    reviewCount,
    customData: cd,
    raw: p,
  };
}

/**
 * 渲染商品卡片 HTML
 * @param {Object} product - normalizeProduct() 的回傳值
 * @param {Object} [options] - 選項
 * @param {boolean} [options.showRating] - 是否顯示評分
 * @param {boolean} [options.showCategory] - 是否顯示分類
 * @param {boolean} [options.lazy] - 延遲載入圖片
 * @returns {string} HTML 字串
 */
export function renderProductCard(product, options = {}) {
  const { showRating = true, showCategory = false, lazy = true } = options;
  const lang = getLang();

  // 標籤 badges
  const badges = product.tags.length > 0
    ? `<div class="product-card__badges">${product.tags.map(t => 
        `<span class="badge ${t.cls}">${t.label}</span>`
      ).join('')}</div>`
    : '';

  // 評分星星
  const stars = product.rating > 0
    ? '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 >= 0.5 ? '½' : '')
    : '';

  const ratingHTML = showRating && product.rating > 0 ? `
    <div class="product-card__rating">
      <span class="rating">${stars}</span>
      <span class="rating__count">(${product.reviewCount})</span>
    </div>
  ` : '';

  const categoryHTML = showCategory && product.category ? `
    <div class="product-card__category">${product.category}</div>
  ` : '';

  // 圖片
  const imgSrc = product.imageUrl || '';
  const imgHTML = imgSrc
    ? `<img src="${imgSrc}" alt="${product.name}" class="product-card__img-inner" ${lazy ? 'loading="lazy"' : ''}/>`
    : `<div class="product-card__img-inner" style="background: linear-gradient(135deg, #636e72 0%, #2d3436 100%);"></div>`;

  // 顏色色票（最多顯示 4 個）
  const colorSwatches = product.colors.length > 0
    ? `<div class="product-card__colors">${
        product.colors.slice(0, 4).map(c => 
          `<span class="color-dot" style="background:${c.hex};" title="${c.name}"></span>`
        ).join('')
      }${product.colors.length > 4 ? `<span class="color-dot color-dot--more">+${product.colors.length - 4}</span>` : ''}</div>`
    : '';

  return `
    <a href="/product-detail.html?id=${product.id}" class="product-card fade-in-up">
      <div class="product-card__img">
        ${imgHTML}
        ${badges}
      </div>
      <div class="product-card__info">
        ${categoryHTML}
        <div class="product-card__name">${product.name}</div>
        <div class="product-card__price">
          <span class="price">${formatPrice(product.price, lang)}</span>
        </div>
        ${ratingHTML}
        ${colorSwatches}
      </div>
    </a>
  `;
}

/**
 * 渲染多個商品卡片到容器中
 * @param {HTMLElement} container
 * @param {Array} products - AI GO product_templates 陣列
 * @param {Object} [options] - renderProductCard 選項
 */
export function renderProductGrid(container, products, options = {}) {
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.5">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/>
        </svg>
        <p>${getLang() === 'zh-TW' ? '目前沒有商品' : 'No products found'}</p>
      </div>
    `;
    return;
  }

  const normalized = products.map(normalizeProduct);
  container.innerHTML = normalized.map(p => renderProductCard(p, options)).join('');

  // 啟動淡入動畫（staggered）
  requestAnimationFrame(() => {
    container.querySelectorAll('.product-card.fade-in-up:not(.visible)').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  });
}
