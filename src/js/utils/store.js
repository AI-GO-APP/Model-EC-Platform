/**
 * 示範商城 — 簡易狀態管理
 * 使用 localStorage 持久化購物車與願望清單，配合自訂事件跨頁面同步
 */

import { STORAGE_KEYS } from './config.js';

const CART_KEY = STORAGE_KEYS.CART;
const WISHLIST_KEY = STORAGE_KEYS.WISHLIST;

// ============================================================
// 購物車
// ============================================================

/**
 * 取得購物車（含規格資訊）
 * @returns {Array} [{ productId, variantId, quantity, selectedOptions }]
 */
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch { return []; }
}

/**
 * 加入購物車
 */
export function addToCart(productId, variantId, quantity = 1, selectedOptions = {}) {
  const cart = getCart();
  const existing = cart.find(item => item.productId === productId && item.variantId === variantId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, variantId, quantity, selectedOptions });
  }
  saveCart(cart);
  return cart;
}

/**
 * 更新購物車商品數量
 */
export function updateCartItemQuantity(productId, variantId, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter(item => !(item.productId === productId && item.variantId === variantId));
  } else {
    const item = cart.find(item => item.productId === productId && item.variantId === variantId);
    if (item) item.quantity = quantity;
  }
  saveCart(cart);
  return cart;
}

/**
 * 移除購物車商品
 */
export function removeFromCart(productId, variantId) {
  const cart = getCart().filter(item => !(item.productId === productId && item.variantId === variantId));
  saveCart(cart);
  return cart;
}

/**
 * 清空購物車
 */
export function clearCart() {
  saveCart([]);
}

/**
 * 取得購物車商品數量
 */
export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cartChange', { detail: { cart } }));
}

// ============================================================
// 願望清單
// ============================================================

/**
 * 取得願望清單
 * @returns {Array<string>} 商品 ID 陣列
 */
export function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
  } catch { return []; }
}

/**
 * 切換願望清單（若已有則移除，否則加入）
 */
export function toggleWishlist(productId) {
  const wishlist = getWishlist();
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  window.dispatchEvent(new CustomEvent('wishlistChange', { detail: { wishlist } }));
  return wishlist;
}

/**
 * 是否在願望清單中
 */
export function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

/**
 * 取得願望清單數量
 */
export function getWishlistCount() {
  return getWishlist().length;
}
