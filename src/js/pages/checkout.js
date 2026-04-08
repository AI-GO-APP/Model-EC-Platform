/**
 * 示範商城 — 結帳頁互動邏輯
 * Auth Guard + 動態訂單摘要 + 四步驟流程 + 建立 sale_orders
 *
 * AI GO sale_orders schema (§8.4)：
 *   state enum: draft | sent | sale | done | cancel
 *   invoice_status enum: no | to_invoice | invoiced
 *   必填：date_order (YYYY-MM-DD)
 *   欄位: name, customer_id, state, date_order, amount_total, amount_untaxed,
 *          carrier_type, invoice_format, delivery_method, tax_type, note, invoice_status, custom_data
 *
 * AI GO sale_order_lines schema：
 *   欄位: order_id, product_id(指向 product_products), name, product_uom_qty, price_unit, price_total, custom_data
 *   注意：product_id FK 指向 product_products 而非 product_templates，
 *         因此 product_template_id 放在 custom_data
 */

import '../../css/cart.css';
import { showToast } from '../components/toast.js';
import { getLang } from '../utils/i18n.js';
import { getCart, clearCart } from '../utils/store.js';
import { formatPrice } from '../utils/variants.js';
import { requireAuth, getCachedUser, proxy } from '../utils/api.js';
import { loadProducts, getProductInfo } from '../utils/product-cache.js';
import {
  FREE_SHIPPING_THRESHOLD, SHIPPING_COSTS,
  ORDER_STATE, INVOICE_STATUS,
} from '../utils/config.js';

let currentStep = 1;

// ============================================================
// 步驟切換
// ============================================================

window.goToStep = function(step) {
  if (step > currentStep && !validateStep(currentStep)) return;

  currentStep = step;

  document.querySelectorAll('.checkout-section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(`step-${step}`);
  if (target) {
    target.classList.remove('hidden');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('.checkout-step').forEach(s => {
    const stepNum = parseInt(s.getAttribute('data-step'));
    s.classList.toggle('active', stepNum === step);
    s.classList.toggle('completed', stepNum < step);
  });

  // 重新計算摘要（物流可能變更）
  renderOrderSummary();
};

function validateStep(step) {
  const lang = getLang();
  if (step === 1) {
    const name = document.getElementById('c-name')?.value;
    const phone = document.getElementById('c-phone')?.value;
    const email = document.getElementById('c-email')?.value;
    if (!name || !phone || !email) {
      showToast(lang === 'zh-TW' ? '請填寫完整的收件資訊' : 'Please fill in all required fields', 'error');
      return false;
    }
  }
  if (step === 3) {
    const invoiceType = document.querySelector('input[name="invoice"]:checked')?.value;
    if (invoiceType === 'mobile') {
      const barcode = document.getElementById('mobile-barcode')?.value;
      if (barcode && !/^\/[A-Z0-9.\-+]{7}$/.test(barcode)) {
        showToast(lang === 'zh-TW' ? '手機條碼格式不正確' : 'Invalid barcode format', 'error');
        return false;
      }
    }
    if (invoiceType === 'business') {
      const taxId = document.getElementById('tax-id')?.value;
      if (!taxId || !/^\d{8}$/.test(taxId)) {
        showToast(lang === 'zh-TW' ? '統一編號必須為 8 碼數字' : 'Tax ID must be 8 digits', 'error');
        return false;
      }
    }
  }
  return true;
}

// ============================================================
// 動態訂單摘要
// ============================================================

function renderOrderSummary() {
  const cart = getCart();
  const lang = getLang();
  const summaryEl = document.querySelector('.checkout-summary');
  if (!summaryEl) return;

  // 購物車商品
  const itemsHTML = cart.map(item => {
    const info = getProductInfo(item.productId);
    const opts = item.selectedOptions || {};
    const variantStr = [opts.color, opts.size].filter(Boolean).join(' / ');
    return `
      <div class="summary-item">
        <div class="summary-item__img">
          ${info.image
            ? `<img src="${info.image}" alt="${info.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`
            : `<div style="background:linear-gradient(135deg,#636e72,#2d3436);width:100%;height:100%;border-radius:inherit;"></div>`
          }
        </div>
        <div class="summary-item__info">
          <span class="summary-item__name">${info.name}</span>
          <small>${variantStr ? variantStr + ' × ' : '× '}${item.quantity}</small>
        </div>
        <span class="summary-item__price">${formatPrice(info.price * item.quantity, lang)}</span>
      </div>
    `;
  }).join('');

  // 計算
  const subtotal = cart.reduce((sum, item) => {
    const info = getProductInfo(item.productId);
    return sum + info.price * item.quantity;
  }, 0);

  const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'home';
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (SHIPPING_COSTS[shippingMethod] || SHIPPING_COSTS.home);
  const total = subtotal + shippingFee;

  summaryEl.innerHTML = `
    <h3>${lang === 'zh-TW' ? '訂單摘要' : 'Order Summary'}</h3>
    <div class="summary-items">${itemsHTML}</div>
    <hr style="border:none;border-top:1px solid var(--color-border-light);margin:1rem 0;"/>
    <div class="summary-row">
      <span>${lang === 'zh-TW' ? '小計' : 'Subtotal'}</span>
      <span>${formatPrice(subtotal, lang)}</span>
    </div>
    <div class="summary-row">
      <span>${lang === 'zh-TW' ? '運費' : 'Shipping'}</span>
      <span>${shippingFee === 0 ? (lang === 'zh-TW' ? '免運費' : 'Free') : formatPrice(shippingFee, lang)}</span>
    </div>
    <hr style="border:none;border-top:1px solid var(--color-border-light);margin:1rem 0;"/>
    <div class="summary-row summary-total">
      <strong>${lang === 'zh-TW' ? '總計' : 'Total'}</strong>
      <strong class="price" style="font-size:1.3rem;">${formatPrice(total, lang)}</strong>
    </div>
  `;
}

// ============================================================
// 建立訂單（送出至 AI GO — 欄位嚴格對齊 §8.4 schema）
// ============================================================

async function placeOrder() {
  const lang = getLang();
  const btn = document.getElementById('btn-place-order');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner" style="display:block;width:20px;height:20px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;margin:0 auto;"></span>`;
  }

  try {
    const cart = getCart();
    if (cart.length === 0) {
      showToast(lang === 'zh-TW' ? '購物車是空的' : 'Cart is empty', 'error');
      return;
    }

    const user = getCachedUser();

    // 收集表單資料
    const formData = {
      name: document.getElementById('c-name')?.value || '',
      phone: document.getElementById('c-phone')?.value || '',
      email: document.getElementById('c-email')?.value || '',
      city: document.getElementById('c-city')?.value || '',
      zip: document.getElementById('c-zip')?.value || '',
      address: document.getElementById('c-address')?.value || '',
      note: document.getElementById('c-note')?.value || '',
      shipping: document.querySelector('input[name="shipping"]:checked')?.value || 'home',
      invoice: document.querySelector('input[name="invoice"]:checked')?.value || 'mobile',
      payment: document.querySelector('input[name="payment"]:checked')?.value || 'credit',
    };

    // 計算金額
    const subtotal = cart.reduce((sum, item) => {
      const info = getProductInfo(item.productId);
      return sum + info.price * item.quantity;
    }, 0);
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (SHIPPING_COSTS[formData.shipping] || SHIPPING_COSTS.home);
    const total = subtotal + shippingFee;

    // 建立 sale_order — 使用 AI GO 正式欄位（§8.4 schema）
    // state: 'draft' (合法 enum)
    // invoice_status: 'no' (合法 enum)
    // delivery_method / carrier_type / invoice_format: 存入 custom_data（非 AI GO enum 欄位）
    const saleOrder = await proxy.create('sale_orders', {
      state: ORDER_STATE.DRAFT,
      date_order: new Date().toISOString().split('T')[0], // YYYY-MM-DD（必填）
      amount_total: total,
      amount_untaxed: subtotal,
      note: formData.note || null,
      invoice_status: INVOICE_STATUS.NO,
      custom_data: {
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: formData.email,
        shipping_address: `${formData.zip} ${formData.city} ${formData.address}`,
        shipping_method: formData.shipping,
        shipping_fee: shippingFee,
        invoice_type: formData.invoice,
        payment_method: formData.payment,
        user_id: user?.id || null,
        order_date: new Date().toISOString(),
        items: cart.map(item => {
          const info = getProductInfo(item.productId);
          return {
            product_id: item.productId,
            name: info.name,
            quantity: item.quantity,
            unit_price: info.price,
            subtotal: info.price * item.quantity,
            variant: item.selectedOptions,
          };
        }),
      },
    });

    // 建立 sale_order_lines — 追蹤失敗的 line
    const failedLines = [];
    for (const item of cart) {
      const info = getProductInfo(item.productId);
      try {
        await proxy.create('sale_order_lines', {
          order_id: saleOrder.id,
          name: info.name,
          product_uom_qty: item.quantity,
          price_unit: info.price,
          price_total: info.price * item.quantity,
          custom_data: {
            product_template_id: item.productId,
            variant: item.selectedOptions || null,
          },
        });
      } catch (e) {
        console.debug('[checkout] 建立 order line 失敗', info.name, e.message);
        failedLines.push(info.name);
      }
    }

    // 成功！清空購物車
    clearCart();

    // 顯示成功訊息（如有失敗的 line 則顯示警告）
    showOrderSuccess(saleOrder.id || saleOrder.name, failedLines);

  } catch (err) {
    console.debug('[checkout] 建立訂單失敗', err.message);
    showToast(
      lang === 'zh-TW' ? `訂單建立失敗：${err.message}` : `Order failed: ${err.message}`,
      'error'
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = lang === 'zh-TW' ? '完成訂單' : 'Place Order';
    }
  }
}

function showOrderSuccess(orderId, failedLines = []) {
  const lang = getLang();
  const warningHTML = failedLines.length > 0 ? `
    <div style="background:var(--color-warning-bg,#fff3cd);border:1px solid var(--color-warning-border,#ffc107);border-radius:8px;padding:1rem;margin:1rem 0;text-align:left;max-width:400px;margin-left:auto;margin-right:auto;">
      <strong>⚠️ ${lang === 'zh-TW' ? '部分商品明細建立失敗' : 'Some line items failed'}</strong>
      <ul style="margin:0.5rem 0 0;padding-left:1.2rem;">
        ${failedLines.map(n => `<li>${n}</li>`).join('')}
      </ul>
      <small style="color:var(--color-text-secondary);">${lang === 'zh-TW' ? '請聯繫客服確認訂單完整性' : 'Please contact support to verify order completeness'}</small>
    </div>
  ` : '';

  const mainEl = document.querySelector('.checkout-layout');
  if (mainEl) {
    mainEl.innerHTML = `
      <div style="text-align:center;padding:4rem 0;grid-column:1/-1;">
        <div style="font-size:4rem;margin-bottom:1rem;">🎉</div>
        <h2>${lang === 'zh-TW' ? '訂單已成功建立！' : 'Order Placed Successfully!'}</h2>
        <p style="color:var(--color-text-secondary);margin:0.5rem 0 0.5rem;">
          ${lang === 'zh-TW' ? '訂單編號' : 'Order ID'}：<strong>${orderId}</strong>
        </p>
        ${warningHTML}
        <p style="color:var(--color-text-secondary);margin:0 0 2rem;">
          ${lang === 'zh-TW' ? '我們將盡快為您處理訂單，感謝您的購買！' : 'We will process your order shortly. Thank you!'}
        </p>
        <div style="display:flex;gap:1rem;justify-content:center;">
          <a href="/account.html?tab=orders" class="btn btn--outline btn--lg">
            ${lang === 'zh-TW' ? '查看訂單' : 'View Orders'}
          </a>
          <a href="/products.html" class="btn btn--accent btn--lg">
            ${lang === 'zh-TW' ? '繼續購物' : 'Continue Shopping'}
          </a>
        </div>
      </div>
    `;
  }
}

// ============================================================
// 初始化
// ============================================================

async function initCheckout() {
  // Auth Guard — 需要登入才能結帳
  if (!requireAuth()) return;

  // 購物車為空則導回
  if (getCart().length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  await loadProducts();

  // 自動填充已登入用戶資訊
  const user = getCachedUser();
  if (user) {
    const emailInput = document.getElementById('c-email');
    if (emailInput && !emailInput.value) emailInput.value = user.email || '';
    const nameInput = document.getElementById('c-name');
    if (nameInput && !nameInput.value) nameInput.value = user.display_name || '';
  }

  // 發票類型切換
  document.querySelectorAll('input[name="invoice"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.invoice-field').forEach(f => f.classList.add('hidden'));
      const fieldMap = { mobile: 'invoice-mobile', citizen: 'invoice-citizen', donation: 'invoice-donation', business: 'invoice-business' };
      const fieldId = fieldMap[radio.value];
      if (fieldId) {
        const field = document.getElementById(fieldId);
        if (field) field.classList.remove('hidden');
      }
    });
  });

  // 物流切換 → 更新摘要
  document.querySelectorAll('input[name="shipping"]').forEach(radio => {
    radio.addEventListener('change', renderOrderSummary);
  });

  // 手機條碼欄位預設可見
  const mobileField = document.getElementById('invoice-mobile');
  if (mobileField) mobileField.classList.remove('hidden');

  // 完成訂單按鈕
  document.getElementById('btn-place-order')?.addEventListener('click', placeOrder);

  // 初始渲染摘要
  renderOrderSummary();
}

document.addEventListener('DOMContentLoaded', initCheckout);
