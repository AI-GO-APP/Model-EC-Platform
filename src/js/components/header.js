/**
 * 示範商城 — Header 共用元件
 * 包含公告欄、導覽列、Mega Menu、語言切換器、手機版漢堡選單、登入狀態
 */

import { t, setLanguage, getLang } from '../utils/i18n.js';
import { getCartCount } from '../utils/store.js';
import { isLoggedIn, getCachedUser, logout } from '../utils/api.js';

export function renderHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const loggedIn = isLoggedIn();
  const user = getCachedUser();
  const userName = user?.display_name || user?.email?.split('@')[0] || '';

  header.innerHTML = `
    <!-- 公告欄 -->
    <div class="announcement-bar">
      <div class="container">
        <p data-i18n="common.freeShipping">${t('common.freeShipping')}</p>
      </div>
    </div>

    <!-- 主導覽 -->
    <nav class="main-nav" role="navigation" aria-label="Main navigation">
      <div class="container nav-inner">
        <!-- 手機漢堡鈕 -->
        <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>

        <!-- Logo -->
        <a href="/" class="nav-logo" aria-label="${t('brand.name')}">
          <span class="logo-text" data-i18n="brand.name">${t('brand.name')}</span>
        </a>

        <!-- 桌面版導覽連結 -->
        <ul class="nav-links" id="nav-links">
          <li><a href="/" data-i18n="nav.home">${t('nav.home')}</a></li>
          <li><a href="/collections.html" data-i18n="nav.collections">${t('nav.collections')}</a></li>
          <li><a href="/products.html" data-i18n="nav.products">${t('nav.products')}</a></li>
          <li><a href="/about.html" data-i18n="nav.about">${t('nav.about')}</a></li>
          <li><a href="/contact.html" data-i18n="nav.contact">${t('nav.contact')}</a></li>
        </ul>

        <!-- 右側工具 -->
        <div class="nav-actions">
          <!-- 語言切換器 -->
          <div class="lang-switcher">
            <button class="lang-btn ${getLang() === 'zh-TW' ? 'active' : ''}" data-lang="zh-TW">繁中</button>
            <span class="lang-divider">|</span>
            <button class="lang-btn ${getLang() === 'en' ? 'active' : ''}" data-lang="en">EN</button>
          </div>

          <!-- 搜尋 -->
          <button class="nav-icon-btn" id="search-toggle" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>

          <!-- 帳戶（登入/未登入切換） -->
          ${loggedIn ? `
            <div class="nav-user-menu" id="nav-user-menu">
              <button class="nav-icon-btn nav-user-btn" id="user-menu-toggle" aria-label="User menu">
                <span class="nav-user-avatar">${userName.charAt(0).toUpperCase()}</span>
              </button>
              <div class="nav-user-dropdown" id="user-dropdown">
                <div class="nav-user-info">
                  <span class="nav-user-name">${userName}</span>
                  <span class="nav-user-email">${user?.email || ''}</span>
                </div>
                <hr/>
                <a href="/account.html" class="nav-user-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span data-i18n="account.profile">${t('account.profile')}</span>
                </a>
                <a href="/account.html?tab=orders" class="nav-user-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                  <span data-i18n="account.orders">${t('account.orders')}</span>
                </a>
                <button class="nav-user-link nav-logout-btn" id="nav-logout-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span data-i18n="account.logout">${t('account.logout')}</span>
                </button>
              </div>
            </div>
          ` : `
            <a href="/account.html?action=login" class="nav-icon-btn" aria-label="Login">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </a>
          `}

          <!-- 願望清單 -->
          <a href="/wishlist.html" class="nav-icon-btn" aria-label="Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </a>

          <!-- 購物車 -->
          <a href="/cart.html" class="nav-icon-btn cart-icon" aria-label="Cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span class="cart-badge" id="cart-badge">${getCartCount()}</span>
          </a>
        </div>
      </div>
    </nav>

    <!-- 手機版全螢幕選單 -->
    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-menu__inner">
        ${loggedIn ? `
          <div class="mobile-menu__user">
            <span class="nav-user-avatar nav-user-avatar--lg">${userName.charAt(0).toUpperCase()}</span>
            <div>
              <div class="mobile-menu__user-name">${userName}</div>
              <div class="mobile-menu__user-email">${user?.email || ''}</div>
            </div>
          </div>
        ` : ''}
        <ul class="mobile-menu__links">
          <li><a href="/" data-i18n="nav.home">${t('nav.home')}</a></li>
          <li><a href="/collections.html" data-i18n="nav.collections">${t('nav.collections')}</a></li>
          <li><a href="/products.html" data-i18n="nav.products">${t('nav.products')}</a></li>
          <li><a href="/about.html" data-i18n="nav.about">${t('nav.about')}</a></li>
          <li><a href="/contact.html" data-i18n="nav.contact">${t('nav.contact')}</a></li>
          <li><a href="/account.html" data-i18n="account.profile">${loggedIn ? t('account.profile') : t('account.login')}</a></li>
        </ul>
        ${loggedIn ? `
          <button class="btn btn--ghost mobile-logout-btn" id="mobile-logout-btn" style="width:100%;margin-top:1rem;color:var(--color-error);">
            ${t('account.logout')}
          </button>
        ` : ''}
        <div class="mobile-menu__lang">
          <button class="lang-btn ${getLang() === 'zh-TW' ? 'active' : ''}" data-lang="zh-TW">繁體中文</button>
          <button class="lang-btn ${getLang() === 'en' ? 'active' : ''}" data-lang="en">English</button>
        </div>
      </div>
    </div>
  `;

  // 事件綁定
  bindHeaderEvents();
}

function bindHeaderEvents() {
  // 語言切換
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
      renderHeader();
    });
  });

  // 漢堡選單
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.classList.toggle('menu-open');
    });
  }

  // 用戶下拉選單
  const userToggle = document.getElementById('user-menu-toggle');
  const userDropdown = document.getElementById('user-dropdown');
  if (userToggle && userDropdown) {
    userToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('open');
    });
    // 點擊外部關閉
    document.addEventListener('click', () => {
      userDropdown.classList.remove('open');
    });
    userDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  // 登出按鈕
  const logoutBtns = document.querySelectorAll('#nav-logout-btn, #mobile-logout-btn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      await logout();
      window.location.href = '/';
    });
  });

  // 購物車 badge 更新
  window.addEventListener('cartChange', () => {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = getCartCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  });

  // 監聽認證事件
  window.addEventListener('authChange', () => {
    renderHeader();
  });

  // 初始化 badge 顯示
  const badge = document.getElementById('cart-badge');
  if (badge) {
    const count = getCartCount();
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}
