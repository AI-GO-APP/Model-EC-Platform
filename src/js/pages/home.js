/**
 * 示範商城 — 首頁互動邏輯
 * 從 AI GO 動態載入精選商品（透過共用 product-cache）
 */

import '../../css/home.css';
import { getLang } from '../utils/i18n.js';
import { renderProductGrid } from '../utils/product-renderer.js';
import { loadProducts, getAllProducts } from '../utils/product-cache.js';

/**
 * 篩選精選商品（有 rating >= 4.7 或有 熱銷/精選 標籤的）
 */
function getFeaturedProducts(products) {
  const featured = products.filter(p => {
    const cd = p.custom_data || {};
    const tags = cd.tags || [];
    const rating = cd.rating || 0;
    return rating >= 4.7 || tags.includes('熱銷') || tags.includes('精選') || tags.includes('新品');
  });

  // 打亂順序後取前 4 個
  return featured
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
}

async function renderFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;

  // 先顯示 skeleton
  container.innerHTML = Array(4).fill('').map(() => `
    <div class="product-card product-card--skeleton fade-in-up visible">
      <div class="product-card__img"><div class="skeleton skeleton--img"></div></div>
      <div class="product-card__info">
        <div class="skeleton skeleton--text" style="width:60%"></div>
        <div class="skeleton skeleton--text" style="width:40%"></div>
        <div class="skeleton skeleton--text" style="width:30%"></div>
      </div>
    </div>
  `).join('');

  await loadProducts(); // 載入快取
  const allProducts = getAllProducts(); // 取得陣列

  // 過濾掉沒有圖片/描述的測試商品
  const validProducts = allProducts.filter(p => p.image_url && p.description_sale);
  const featured = getFeaturedProducts(validProducts);

  if (featured.length > 0) {
    renderProductGrid(container, featured, { showRating: true, showCategory: true });
  } else if (validProducts.length > 0) {
    // 沒有精選商品就顯示前 4 個
    renderProductGrid(container, validProducts.slice(0, 4), { showRating: true, showCategory: true });
  } else {
    container.innerHTML = '';
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedProducts();
  window.addEventListener('langChange', renderFeaturedProducts);
});
