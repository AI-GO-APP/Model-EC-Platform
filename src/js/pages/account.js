/**
 * 示範商城 — 帳戶頁面邏輯
 * 處理登入/註冊表單、會員中心 Tab 切換、個人資料更新
 *
 * 注意：AI GO Custom App Auth 不支援 PATCH/PUT /me 更新個人資料
 * 注意：AI GO Query API 不支援 'contains' 運算子，訂單查詢必須 client-side 過濾
 */

import '../../css/account.css';
import { isLoggedIn, getCachedUser, login, register, logout, getMe, proxy } from '../utils/api.js';
import { t, getLang } from '../utils/i18n.js';
import { formatPrice } from '../utils/variants.js';

// ============================================================
// 初始化
// ============================================================

function init() {

  // 根據登入狀態顯示不同面板
  const authPanel = document.getElementById('auth-panel');
  const memberPanel = document.getElementById('member-panel');

  if (isLoggedIn()) {
    authPanel.style.display = 'none';
    memberPanel.style.display = 'block';
    initMemberPanel();
  } else {
    authPanel.style.display = 'block';
    memberPanel.style.display = 'none';
    initAuthPanel();
  }

  // 監聽認證變化
  window.addEventListener('authChange', (e) => {
    if (e.detail.type === 'login') {
      authPanel.style.display = 'none';
      memberPanel.style.display = 'block';
      initMemberPanel();
    } else {
      authPanel.style.display = 'block';
      memberPanel.style.display = 'none';
      initAuthPanel();
    }
  });
}

// ============================================================
// 未登入：登入/註冊面板
// ============================================================

function initAuthPanel() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');

  // 若 URL 帶 action=register，自動切到註冊 Tab
  if (action === 'register') {
    switchToTab('register');
  } else {
    switchToTab('login');
  }

  // Tab 切換
  document.getElementById('tab-login')?.addEventListener('click', () => switchToTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => switchToTab('register'));

  // 密碼顯示/隱藏
  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.classList.toggle('active', !isPassword);
      }
    });
  });

  // 登入表單
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  // 註冊表單
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
}

function switchToTab(tab) {
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (tab === 'login') {
    loginTab?.classList.add('active');
    registerTab?.classList.remove('active');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
  } else {
    loginTab?.classList.remove('active');
    registerTab?.classList.add('active');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit');
  const errorEl = document.getElementById('login-error');

  errorEl.style.display = 'none';
  setLoading(submitBtn, true);

  try {
    await login(email, password);
    // 登入成功 — 檢查是否有 redirect
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      window.location.href = redirect;
    }
    // authChange 事件會自動切換到會員面板
  } catch (err) {
    errorEl.textContent = getErrorMessage(err, 'login');
    errorEl.style.display = 'block';
  } finally {
    setLoading(submitBtn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  const submitBtn = document.getElementById('register-submit');
  const errorEl = document.getElementById('register-error');

  errorEl.style.display = 'none';

  // 密碼確認
  if (password !== confirm) {
    errorEl.textContent = t('account.passwordMismatch') !== 'account.passwordMismatch'
      ? t('account.passwordMismatch') : '兩次輸入的密碼不一致';
    errorEl.style.display = 'block';
    return;
  }

  if (password.length < 8) {
    errorEl.textContent = '密碼至少需要 8 個字元';
    errorEl.style.display = 'block';
    return;
  }

  setLoading(submitBtn, true);

  try {
    await register(email, password, name);
    // 註冊成功 — 自動登入，authChange 事件會切換面板
  } catch (err) {
    errorEl.textContent = getErrorMessage(err, 'register');
    errorEl.style.display = 'block';
  } finally {
    setLoading(submitBtn, false);
  }
}

// ============================================================
// 已登入：會員中心
// ============================================================

async function initMemberPanel() {
  const user = getCachedUser();
  if (!user) return;

  // 填充個人資料
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  if (nameInput) nameInput.value = user.display_name || '';
  if (emailInput) emailInput.value = user.email || '';

  // URL tab 參數
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') || 'profile';
  switchAccountTab(tab);

  // Tab 切換
  document.querySelectorAll('.account-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchAccountTab(tabName);
    });
  });

  // 登出
  document.getElementById('sidebar-logout')?.addEventListener('click', async () => {
    await logout();
    window.location.href = '/';
  });

  // 儲存個人資料按鈕（AI GO 目前不支援 update-profile API）
  document.getElementById('save-profile')?.addEventListener('click', () => {
    const lang = getLang();
    const notice = lang === 'zh-TW'
      ? '個人資料修改功能即將推出，目前暫不支援更新顯示名稱。'
      : 'Profile update is coming soon.';
    alert(notice);
  });

  // 從伺服器重新驗證用戶
  try {
    const freshUser = await getMe();
    if (nameInput) nameInput.value = freshUser.display_name || '';
  } catch (e) {
    console.debug('[account] getMe 失敗，Token 可能已過期', e.message);
  }

  // 載入訂單歷史
  loadOrders();
}

/**
 * 載入訂單歷史
 * AI GO Query API 不支援 'contains' 運算子，因此必須：
 * 1. 拉取全部訂單（分批 100 筆）
 * 2. Client-side 過濾出 custom_data.user_id === 當前用戶
 */
async function loadOrders() {
  const ordersList = document.getElementById('orders-list');
  if (!ordersList) return;
  const lang = getLang();
  const user = getCachedUser();
  if (!user?.id) {
    ordersList.innerHTML = `<div class="empty-state"><p>${lang === 'zh-TW' ? '尚無訂單記錄' : 'No orders yet'}</p></div>`;
    return;
  }

  // 顯示載入狀態
  ordersList.innerHTML = `<div class="empty-state"><p>${lang === 'zh-TW' ? '載入中...' : 'Loading...'}</p></div>`;

  try {
    // 分批拉取訂單（每批 100 筆，最多拉 5 批 = 500 筆）
    const allOrders = [];
    const batchSize = 100;
    const maxBatches = 5;
    for (let i = 0; i < maxBatches; i++) {
      const batch = await proxy.list('sale_orders', {
        limit: batchSize,
        offset: i * batchSize,
      });
      if (!Array.isArray(batch) || batch.length === 0) break;
      allOrders.push(...batch);
      if (batch.length < batchSize) break; // 沒有更多了
    }

    // Client-side 過濾：只保留屬於當前用戶的訂單
    const myOrders = allOrders.filter(order => {
      const cd = order.custom_data || {};
      return cd.user_id === user.id;
    });

    // 依日期降序排列（最新的在前）
    myOrders.sort((a, b) => {
      const da = a.custom_data?.order_date || a.date_order || '';
      const db = b.custom_data?.order_date || b.date_order || '';
      return new Date(db) - new Date(da);
    });

    if (myOrders.length === 0) {
      ordersList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
          <p>${lang === 'zh-TW' ? '尚無訂單記錄' : 'No orders yet'}</p>
        </div>
      `;
      return;
    }

    const statusLabels = {
      draft: { zh: '處理中', en: 'Processing', cls: 'badge--new' },
      sent: { zh: '已傳送', en: 'Sent', cls: 'badge--new' },
      sale: { zh: '已確認', en: 'Confirmed', cls: 'badge--bestseller' },
      done: { zh: '已完成', en: 'Completed', cls: 'badge--handmade' },
      cancel: { zh: '已取消', en: 'Cancelled', cls: 'badge--out' },
    };

    ordersList.innerHTML = myOrders.map(order => {
      const cd = order.custom_data || {};
      const status = statusLabels[order.state] || statusLabels.draft;
      const dateStr = cd.order_date || order.date_order;
      const date = dateStr ? new Date(dateStr).toLocaleDateString('zh-TW') : '';
      const itemCount = cd.items ? cd.items.length : 0;

      return `
        <div class="order-card">
          <div class="order-info">
            <strong>${order.name || `#${order.id.substring(0, 8)}`}</strong>
            <div class="order-date">${date}${itemCount ? ` · ${itemCount} ${lang === 'zh-TW' ? '件商品' : 'items'}` : ''}</div>
          </div>
          <span class="badge ${status.cls}">${lang === 'en' ? status.en : status.zh}</span>
          <span class="price">${formatPrice(order.amount_total || 0, lang)}</span>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.debug('[account] 載入訂單失敗', err.message);
    ordersList.innerHTML = `
      <div class="empty-state">
        <p>${lang === 'zh-TW' ? '載入訂單時發生錯誤' : 'Error loading orders'}</p>
      </div>
    `;
  }
}

function switchAccountTab(tabName) {
  // 更新側邊選單
  document.querySelectorAll('.account-nav-btn[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // 更新內容面板
  document.querySelectorAll('.account-tab-content').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-content-${tabName}`);
  });

  // 更新 URL
  const url = new URL(window.location);
  url.searchParams.set('tab', tabName);
  window.history.replaceState({}, '', url.toString());
}

// ============================================================
// 工具函數
// ============================================================

function setLoading(btn, loading) {
  if (!btn) return;
  const text = btn.querySelector('span:first-child');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (text) text.style.opacity = loading ? '0' : '1';
  if (spinner) spinner.style.display = loading ? 'block' : 'none';
}

function getErrorMessage(err, context) {
  if (err.status === 409) return '此 Email 已被註冊';
  if (err.status === 401) return context === 'login' ? 'Email 或密碼不正確' : '認證失敗';
  if (err.status === 403) return '存取被拒絕';
  return err.message || '發生未知錯誤，請稍後再試';
}

// 啟動
document.addEventListener('DOMContentLoaded', init);
