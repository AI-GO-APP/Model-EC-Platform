/**
 * 示範商城 — 購物車頁面邏輯
 * 動態渲染購物車商品列表，即時計算小計/運費/總計
 */

import '../../css/cart.css';
import { getCart, updateCartItemQuantity, removeFromCart } from '../utils/store.js';
import { getLang } from '../utils/i18n.js';
import { formatPrice } from '../utils/variants.js';
import { loadProducts, getProductInfo } from '../utils/product-cache.js';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COSTS } from '../utils/config.js';

// ============================================================
// 渲染
// ============================================================

function renderCart() {
  const cart = getCart();
  const cartEmpty = document.getElementById('cart-empty');
  const cartItems = document.getElementById('cart-items');
  const lang = getLang();

  if (cart.length === 0) {
    if (cartEmpty) cartEmpty.style.display = 'block';
    if (cartItems) cartItems.style.display = 'none';
    updateSummary(0);
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  if (cartItems) cartItems.style.display = 'block';

  cartItems.innerHTML = cart.map(item => {
    const info = getProductInfo(item.productId);
    const opts = item.selectedOptions || {};
    const variantStr = [opts.color, opts.size].filter(Boolean).join(' / ');
    const lineTotal = info.price * item.quantity;

    return `
      <div class="cart-item" data-product="${item.productId}" data-variant="${item.variantId}">
        <div class="cart-item__img">
          ${info.image
            ? `<img src="${info.image}" alt="${info.name}" />`
            : `<div style="background:linear-gradient(135deg,#636e72,#2d3436);width:100%;height:100%;"></div>`
          }
        </div>
        <div class="cart-item__details">
          <a href="/product-detail.html?id=${item.productId}" class="cart-item__name">${info.name}</a>
          ${variantStr ? `<div class="cart-item__variant">${variantStr}</div>` : ''}
          <div class="cart-item__unit-price">${formatPrice(info.price, lang)}</div>
        </div>
        <div class="pdp-qty" style="margin:0;">
          <button class="qty-btn cart-qty-minus" data-product="${item.productId}" data-variant="${item.variantId}">−</button>
          <input type="number" value="${item.quantity}" min="1" max="99" class="qty-input cart-qty-input"
                 data-product="${item.productId}" data-variant="${item.variantId}" />
          <button class="qty-btn cart-qty-plus" data-product="${item.productId}" data-variant="${item.variantId}">+</button>
        </div>
        <span class="price cart-item__total" style="min-width:100px;text-align:right;">${formatPrice(lineTotal, lang)}</span>
        <button class="btn btn--ghost cart-remove" data-product="${item.productId}" data-variant="${item.variantId}"
                style="color:var(--color-text-light);font-size:1.2rem;" aria-label="Remove">✕</button>
      </div>
    `;
  }).join('');

  // 綁定事件
  cartItems.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.dataset.product;
      const vId = btn.dataset.variant;
      const input = cartItems.querySelector(`.cart-qty-input[data-product="${pId}"][data-variant="${vId}"]`);
      const newQty = Math.max(1, parseInt(input.value) - 1);
      updateCartItemQuantity(pId, vId, newQty);
      renderCart();
    });
  });

  cartItems.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.dataset.product;
      const vId = btn.dataset.variant;
      const input = cartItems.querySelector(`.cart-qty-input[data-product="${pId}"][data-variant="${vId}"]`);
      const newQty = Math.min(99, parseInt(input.value) + 1);
      updateCartItemQuantity(pId, vId, newQty);
      renderCart();
    });
  });

  cartItems.querySelectorAll('.cart-qty-input').forEach(input => {
    input.addEventListener('change', () => {
      const qty = Math.max(1, Math.min(99, parseInt(input.value) || 1));
      updateCartItemQuantity(input.dataset.product, input.dataset.variant, qty);
      renderCart();
    });
  });

  cartItems.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.product, btn.dataset.variant);
      renderCart();
    });
  });

  // 計算小計
  const subtotal = cart.reduce((sum, item) => {
    const info = getProductInfo(item.productId);
    return sum + info.price * item.quantity;
  }, 0);

  updateSummary(subtotal);
}

function updateSummary(subtotal) {
  const lang = getLang();
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COSTS.home;
  const total = subtotal + shippingFee;

  const summaryEl = document.querySelector('.checkout-summary');
  if (!summaryEl) return;

  const shippingText = subtotal === 0
    ? (lang === 'zh-TW' ? '結帳時計算' : 'Calculated at checkout')
    : (shippingFee === 0
        ? (lang === 'zh-TW' ? '免運費 🎉' : 'Free Shipping 🎉')
        : formatPrice(shippingFee, lang));

  summaryEl.innerHTML = `
    <h3>${lang === 'zh-TW' ? '訂單摘要' : 'Order Summary'}</h3>
    <div class="summary-row">
      <span>${lang === 'zh-TW' ? '小計' : 'Subtotal'}</span>
      <span>${formatPrice(subtotal, lang)}</span>
    </div>
    <div class="summary-row">
      <span>${lang === 'zh-TW' ? '運費' : 'Shipping'}</span>
      <span>${shippingText}</span>
    </div>
    <hr style="border:none;border-top:1px solid var(--color-border-light);margin:1rem 0;"/>
    <div class="summary-row summary-total">
      <strong>${lang === 'zh-TW' ? '總計' : 'Total'}</strong>
      <strong class="price" style="font-size:1.3rem;">${formatPrice(total, lang)}</strong>
    </div>
    <a href="/checkout.html" class="btn btn--accent btn--full btn--lg" style="margin-top:1rem;">
      ${lang === 'zh-TW' ? '前往結帳' : 'Proceed to Checkout'}
    </a>
    ${subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? `
      <p style="font-size:0.82rem;color:var(--color-text-secondary);text-align:center;margin-top:0.75rem;">
        ${lang === 'zh-TW'
          ? `再消費 ${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal, lang)} 即可免運`
          : `Spend ${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal, lang)} more for free shipping`}
      </p>
    ` : ''}
  `;
}

// ============================================================
// 初始化
// ============================================================

async function init() {
  await loadProducts();
  renderCart();

  window.addEventListener('cartChange', renderCart);
  window.addEventListener('langChange', renderCart);
}

document.addEventListener('DOMContentLoaded', init);
