/**
 * 示範商城 — 商品列表頁邏輯
 * 從 AI GO 動態載入全部商品，支援分類篩選、價格篩選、排序
 */

import '../../css/products.css';
import { getLang, t } from '../utils/i18n.js';
import { renderProductGrid, normalizeProduct } from '../utils/product-renderer.js';
import { loadProducts as loadProductCache, getAllProducts } from '../utils/product-cache.js';

let allProducts = [];
let filteredProducts = [];

// 篩選狀態
let filters = {
  categories: new Set(),
  maxPrice: 50000,
  search: '',
};
let sortBy = 'newest';
let currentPage = 0;
const PAGE_SIZE = 12;

// ============================================================
// 篩選 & 排序
// ============================================================

function applyFilters() {
  const lang = getLang();

  filteredProducts = allProducts
    .filter(p => p.image_url && p.description_sale)  // 過濾無效
    .filter(p => {
      // 分類篩選
      if (filters.categories.size > 0) {
        const cd = p.custom_data || {};
        const catKey = (cd.category_en || '').toLowerCase();
        const catDisplay = cd.category_display || '';
        if (!filters.categories.has(catKey) && !filters.categories.has(catDisplay)) {
          return false;
        }
      }
      return true;
    })
    .filter(p => {
      // 價格篩選
      return (p.list_price || 0) <= filters.maxPrice;
    })
    .filter(p => {
      // 搜尋
      if (!filters.search) return true;
      const q = filters.search.toLowerCase();
      const cd = p.custom_data || {};
      return p.name.toLowerCase().includes(q)
        || (cd.name_en || '').toLowerCase().includes(q)
        || (p.default_code || '').toLowerCase().includes(q);
    });

  // 排序
  filteredProducts.sort((a, b) => {
    switch (sortBy) {
      case 'price-asc': return (a.list_price || 0) - (b.list_price || 0);
      case 'price-desc': return (b.list_price || 0) - (a.list_price || 0);
      case 'popular': {
        const ra = a.custom_data?.rating || 0;
        const rb = b.custom_data?.rating || 0;
        return rb - ra;
      }
      case 'newest':
      default:
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
  });

  currentPage = 0;
  renderProducts();
  updateProductCount();
}

function renderProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  const end = (currentPage + 1) * PAGE_SIZE;
  const visible = filteredProducts.slice(0, end);

  renderProductGrid(container, visible, { showRating: true, showCategory: true });

  // 載入更多按鈕
  const loadMoreBtn = document.querySelector('.products-load-more button');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = end >= filteredProducts.length ? 'none' : 'inline-flex';
  }
}

function updateProductCount() {
  const el = document.getElementById('product-count');
  if (el) {
    const lang = getLang();
    el.textContent = lang === 'zh-TW'
      ? `${filteredProducts.length} 件商品`
      : `${filteredProducts.length} Products`;
  }
}

// ============================================================
// 篩選 UI — 動態分類
// ============================================================

function buildFilterUI() {
  const sidebar = document.getElementById('filter-sidebar');
  if (!sidebar) return;

  // 收集所有分類
  const categories = new Map();
  allProducts.forEach(p => {
    const cd = p.custom_data || {};
    if (cd.category_display) {
      const key = (cd.category_en || cd.category_display).toLowerCase();
      if (!categories.has(key)) {
        categories.set(key, {
          key,
          label: cd.category_display,
          labelEn: cd.category_en || cd.category_display,
          count: 0,
        });
      }
      categories.get(key).count++;
    }
  });

  const lang = getLang();

  // 取得最高價格
  const maxPrice = Math.max(...allProducts.map(p => p.list_price || 0), 1000);
  const roundedMax = Math.ceil(maxPrice / 1000) * 1000;

  sidebar.innerHTML = `
    <h3 data-i18n="common.filter">${t('common.filter')}</h3>
    
    <div class="filter-group">
      <h4>${lang === 'zh-TW' ? '分類' : 'Category'}</h4>
      ${[...categories.values()].map(cat => `
        <label class="filter-checkbox">
          <input type="checkbox" value="${cat.key}" class="cat-filter"/>
          <span>${lang === 'en' ? cat.labelEn : cat.label} (${cat.count})</span>
        </label>
      `).join('')}
    </div>

    <div class="filter-group">
      <h4>${lang === 'zh-TW' ? '價格範圍' : 'Price Range'}</h4>
      <input type="range" min="0" max="${roundedMax}" value="${roundedMax}" id="price-range-slider" step="500"/>
      <div class="filter-range-labels">
        <span>NT$0</span>
        <span id="price-range-max">NT$${roundedMax.toLocaleString()}</span>
      </div>
    </div>

    <button class="btn btn--ghost btn--sm" id="clear-filters" style="margin-top:0.5rem;width:100%;">
      ${lang === 'zh-TW' ? '清除篩選' : 'Clear Filters'}
    </button>
  `;

  // 事件綁定
  sidebar.querySelectorAll('.cat-filter').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        filters.categories.add(cb.value);
      } else {
        filters.categories.delete(cb.value);
      }
      applyFilters();
    });
  });

  const priceSlider = document.getElementById('price-range-slider');
  const priceLabel = document.getElementById('price-range-max');
  if (priceSlider) {
    priceSlider.addEventListener('input', () => {
      const val = parseInt(priceSlider.value);
      filters.maxPrice = val;
      if (priceLabel) priceLabel.textContent = `NT$${val.toLocaleString()}`;
    });
    priceSlider.addEventListener('change', () => {
      applyFilters();
    });
  }

  document.getElementById('clear-filters')?.addEventListener('click', () => {
    filters.categories.clear();
    filters.maxPrice = roundedMax;
    sidebar.querySelectorAll('.cat-filter').forEach(cb => cb.checked = false);
    if (priceSlider) priceSlider.value = roundedMax;
    if (priceLabel) priceLabel.textContent = `NT$${roundedMax.toLocaleString()}`;
    applyFilters();
  });

  // 從 URL 載入分類
  const urlParams = new URLSearchParams(window.location.search);
  const urlCat = urlParams.get('cat');
  if (urlCat) {
    filters.categories.add(urlCat);
    const cb = sidebar.querySelector(`.cat-filter[value="${urlCat}"]`);
    if (cb) cb.checked = true;
  }
}

// ============================================================
// 初始化
// ============================================================

async function init() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  // 顯示 skeleton
  container.innerHTML = Array(8).fill('').map(() => `
    <div class="product-card product-card--skeleton fade-in-up visible">
      <div class="product-card__img"><div class="skeleton skeleton--img"></div></div>
      <div class="product-card__info">
        <div class="skeleton skeleton--text" style="width:70%"></div>
        <div class="skeleton skeleton--text" style="width:45%"></div>
        <div class="skeleton skeleton--text" style="width:30%"></div>
      </div>
    </div>
  `).join('');

  await loadProductCache(); // 載入到共用快取
  allProducts = getAllProducts(); // 取得陣列

  buildFilterUI();

  // 排序
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortBy = sortSelect.value;
      applyFilters();
    });
  }

  // 載入更多
  document.querySelector('.products-load-more button')?.addEventListener('click', () => {
    currentPage++;
    renderProducts();
  });

  applyFilters();
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('langChange', () => {
  buildFilterUI();
  applyFilters();
});
