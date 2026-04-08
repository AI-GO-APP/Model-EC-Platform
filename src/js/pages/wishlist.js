/**
 * 示範商城 — 願望清單頁面邏輯
 * 根據 localStorage 的願望清單 ID 載入商品資料並渲染網格
 */

import { getWishlist, toggleWishlist } from '../utils/store.js';
import { getLang } from '../utils/i18n.js';
import { renderProductGrid } from '../utils/product-renderer.js';
import { showToast } from '../components/toast.js';
import { loadProducts, getAllProducts } from '../utils/product-cache.js';

function renderWishlist() {
  const wishlistIds = getWishlist();
  const emptyEl = document.getElementById('wishlist-empty');
  const gridEl = document.getElementById('wishlist-grid');
  const lang = getLang();

  if (wishlistIds.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (gridEl) gridEl.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (gridEl) gridEl.style.display = 'grid';

  // 從共用快取找到對應商品
  const allProducts = getAllProducts();
  const productMap = {};
  allProducts.forEach(p => { productMap[p.id] = p; });

  const products = wishlistIds
    .map(id => productMap[id])
    .filter(Boolean);

  if (products.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (gridEl) gridEl.style.display = 'none';
    return;
  }

  // 用共用渲染器渲染
  renderProductGrid(gridEl, products, { showRating: true, showCategory: true });

  // 在每個卡片上加入移除按鈕
  gridEl.querySelectorAll('.product-card').forEach(card => {
    const link = card.getAttribute('href') || '';
    const idMatch = link.match(/id=([^&]+)/);
    if (idMatch) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'wishlist-remove-btn';
      removeBtn.innerHTML = '✕';
      removeBtn.title = lang === 'zh-TW' ? '移除' : 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(idMatch[1]);
        showToast(lang === 'zh-TW' ? '已從願望清單移除' : 'Removed from wishlist', 'success');
        renderWishlist();
      });
      card.querySelector('.product-card__img')?.appendChild(removeBtn);
    }
  });
}

async function init() {
  await loadProducts();
  renderWishlist();

  window.addEventListener('wishlistChange', renderWishlist);
  window.addEventListener('langChange', renderWishlist);
}

document.addEventListener('DOMContentLoaded', init);
