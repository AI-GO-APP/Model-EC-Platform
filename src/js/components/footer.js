/**
 * 示範商城 — Footer 共用元件
 */

import { t } from '../utils/i18n.js';

export function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-main">
      <div class="container footer-grid">
        <!-- 品牌介紹 -->
        <div class="footer-col">
          <h3 class="footer-col__title" data-i18n="brand.name">${t('brand.name')}</h3>
          <p class="footer-col__desc" data-i18n="footer.aboutDesc">${t('footer.aboutDesc')}</p>
          <div class="footer-social">
            <a href="#" aria-label="Facebook"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
            <a href="#" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r="1.5"/></svg></a>
            <a href="#" aria-label="LINE"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.81 2 10.5c0 3.68 2.62 6.86 6.51 8.08l-.57 2.09a.46.46 0 0 0 .65.53l2.49-1.6c.3.03.61.04.92.04 5.52 0 10-3.81 10-8.5S17.52 2 12 2z"/></svg></a>
          </div>
        </div>

        <!-- 快速連結 -->
        <div class="footer-col">
          <h3 class="footer-col__title" data-i18n="footer.quickLinks">${t('footer.quickLinks')}</h3>
          <ul class="footer-col__list">
            <li><a href="/products.html" data-i18n="nav.products">${t('nav.products')}</a></li>
            <li><a href="/collections.html" data-i18n="nav.collections">${t('nav.collections')}</a></li>
            <li><a href="/about.html" data-i18n="nav.about">${t('nav.about')}</a></li>
            <li><a href="/contact.html" data-i18n="nav.contact">${t('nav.contact')}</a></li>
          </ul>
        </div>

        <!-- 顧客服務 -->
        <div class="footer-col">
          <h3 class="footer-col__title" data-i18n="footer.customerService">${t('footer.customerService')}</h3>
          <ul class="footer-col__list">
            <li><a href="#" data-i18n="footer.shippingPolicy">${t('footer.shippingPolicy')}</a></li>
            <li><a href="#" data-i18n="footer.returnPolicy">${t('footer.returnPolicy')}</a></li>
            <li><a href="#" data-i18n="footer.faq">${t('footer.faq')}</a></li>
            <li><a href="#" data-i18n="footer.privacyPolicy">${t('footer.privacyPolicy')}</a></li>
          </ul>
        </div>

        <!-- 電子報 -->
        <div class="footer-col">
          <h3 class="footer-col__title" data-i18n="footer.newsletter">${t('footer.newsletter')}</h3>
          <p class="footer-col__desc" data-i18n="footer.newsletterDesc">${t('footer.newsletterDesc')}</p>
          <form class="footer-newsletter" onsubmit="return false;">
            <input type="email" data-i18n="footer.emailPlaceholder" data-i18n-attr="placeholder" placeholder="${t('footer.emailPlaceholder')}" required />
            <button type="submit" class="btn btn--accent" data-i18n="footer.subscribe">${t('footer.subscribe')}</button>
          </form>
        </div>
      </div>
    </div>

    <!-- 付款/物流圖示 + 版權 -->
    <div class="footer-bottom">
      <div class="container footer-bottom__inner">
        <div class="payment-icons">
          <span class="payment-icon" title="Visa">💳 Visa</span>
          <span class="payment-icon" title="Mastercard">💳 MC</span>
          <span class="payment-icon" title="JCB">💳 JCB</span>
          <span class="payment-icon" title="LINE Pay">📱 LINE Pay</span>
          <span class="payment-icon" title="Apple Pay">🍎 Apple Pay</span>
        </div>
        <p class="copyright" data-i18n="footer.copyright">${t('footer.copyright')}</p>
      </div>
    </div>
  `;
}
