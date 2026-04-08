/**
 * 示範商城 — 全站入口 JS
 * 初始化共用元件與核心引擎
 */

import '../css/index.css';
import '../css/components.css';

import { initI18n } from './utils/i18n.js';
import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { injectOrganizationSchema, updateCanonicalUrl, updateHreflangLinks } from './utils/seo.js';

// 主初始化
async function init() {
  // 1. 初始化 i18n 引擎
  await initI18n();

  // 2. 渲染共用元件
  renderHeader();
  renderFooter();

  // 3. SEO 全站結構化資料
  injectOrganizationSchema();
  updateCanonicalUrl();
  updateHreflangLinks();

  // 4. 滾動觸發淡入動畫
  initScrollAnimations();

  // 5. 語言切換時重新渲染元件
  window.addEventListener('langChange', () => {
    renderHeader();
    renderFooter();
    updateHreflangLinks();
  });
}

/**
 * 滾動觸發淡入動畫
 */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));
}

// 啟動
document.addEventListener('DOMContentLoaded', init);
