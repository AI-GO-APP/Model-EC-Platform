/**
 * 示範商城 — 商品資料快取
 * 統一處理商品資料載入和查詢，消除各頁面的重複邏輯
 */

import { isLoggedIn } from './api.js';
import { getLang } from './i18n.js';

/** 單例快取 */
let _cache = {};
let _loaded = false;

/**
 * 載入商品資料到快取（已登入走 API，未登入走本地 JSON）
 * @returns {Promise<Object>} productId → product 物件的 Map
 */
export async function loadProducts() {
  if (_loaded && Object.keys(_cache).length > 0) return _cache;

  // 已登入：走 ext proxy
  try {
    if (isLoggedIn()) {
      const { proxy } = await import('./api.js');
      const products = await proxy.list('product_templates', { limit: 100 });
      products.forEach(p => { _cache[p.id] = p; });
      _loaded = true;
      return _cache;
    }
  } catch (e) {
    console.debug('[product-cache] API 載入失敗，fallback 到本地快取', e.message);
  }

  // 未登入 / API 失敗：走本地 JSON 快取
  try {
    const res = await fetch('/data/cache/product_templates.json');
    if (res.ok) {
      const products = await res.json();
      products.forEach(p => { _cache[p.id] = p; });
      _loaded = true;
    }
  } catch (e) {
    console.debug('[product-cache] 本地快取也載入失敗', e.message);
  }

  return _cache;
}

/**
 * 根據商品 ID 取得商品資訊（含 i18n 名稱）
 * @param {string} productId
 * @returns {{ name: string, price: number, image: string, templateId: string }}
 */
export function getProductInfo(productId) {
  const p = _cache[productId];
  if (!p) return { name: '未知商品', price: 0, image: '', templateId: productId };

  const lang = getLang();
  const cd = p.custom_data || {};

  return {
    name: lang === 'en' && cd.name_en ? cd.name_en : p.name,
    price: p.list_price || 0,
    image: p.image_url || '',
    templateId: p.id,
  };
}

/**
 * 取得所有已快取的商品
 * @returns {Array} 商品陣列
 */
export function getAllProducts() {
  return Object.values(_cache);
}

/**
 * 清除快取（用於測試或強制重新載入）
 */
export function clearCache() {
  _cache = {};
  _loaded = false;
}
