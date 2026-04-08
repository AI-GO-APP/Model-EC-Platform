/**
 * 示範商城 — i18n 雙語引擎
 * 支援繁體中文（預設）與英文即時切換
 */

// 語言包快取
let translations = {};
let currentLang = 'zh-TW';

/**
 * 初始化 i18n 引擎
 */
export async function initI18n() {
  currentLang = localStorage.getItem('lang') || 'zh-TW';
  await loadLanguage(currentLang);
  translatePage();
  updateHtmlLang();
  updateLangSwitcher();
}

/**
 * 載入語言包
 */
async function loadLanguage(lang) {
  try {
    const module = await import(`../../data/i18n/${lang}.json`);
    translations = module.default || module;
  } catch (e) {
    console.debug('[i18n] 無法載入語言包:', lang, e.message);
    if (lang !== 'zh-TW') {
      const fallback = await import('../../data/i18n/zh-TW.json');
      translations = fallback.default || fallback;
    }
  }
}

/**
 * 切換語言
 */
export async function setLanguage(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  await loadLanguage(lang);
  translatePage();
  updateHtmlLang();
  updateLangSwitcher();
  updateDocumentMeta();
  // 觸發自訂事件，讓其他元件得知語言已切換
  window.dispatchEvent(new CustomEvent('langChange', { detail: { lang } }));
}

/**
 * 取得目前語言
 */
export function getLang() {
  return currentLang;
}

/**
 * 翻譯函數 — 支援巢狀 key（如 'nav.home'）
 */
export function t(key) {
  const keys = key.split('.');
  let result = translations;
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return key; // 找不到則回傳 key 本身
    }
  }
  return typeof result === 'string' ? result : key;
}

/**
 * 取得雙語資料欄位的目前語言值
 */
export function localize(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[currentLang] || obj['zh-TW'] || obj['en'] || '';
}

/**
 * 掃描所有 [data-i18n] 元素並替換文字
 */
export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (translated !== key) {
      // 支援 placeholder 屬性
      if (el.hasAttribute('data-i18n-attr')) {
        const attr = el.getAttribute('data-i18n-attr');
        el.setAttribute(attr, translated);
      } else {
        el.textContent = translated;
      }
    }
  });
}

/**
 * 更新 <html lang> 屬性（觸發 CSS 字型切換）
 */
function updateHtmlLang() {
  document.documentElement.lang = currentLang === 'zh-TW' ? 'zh-TW' : 'en';
}

/**
 * 更新語言切換器的 active 狀態
 */
function updateLangSwitcher() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const btnLang = btn.getAttribute('data-lang');
    btn.classList.toggle('active', btnLang === currentLang);
  });
}

/**
 * 更新文件標題和 meta description
 */
function updateDocumentMeta() {
  const pageKey = document.body.getAttribute('data-page') || 'home';
  const title = t(`meta.${pageKey}.title`);
  const desc = t(`meta.${pageKey}.description`);
  if (title && title !== `meta.${pageKey}.title`) {
    document.title = title;
  }
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && desc && desc !== `meta.${pageKey}.description`) {
    metaDesc.setAttribute('content', desc);
  }
}
