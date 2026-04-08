/**
 * 示範商城 — SEO / GEO 結構化資料引擎
 * 動態注入 JSON-LD Schema.org 結構化資料
 */

import { getLang, localize, t } from './i18n.js';

/**
 * 注入 JSON-LD 腳本至 <head>
 */
function injectJsonLd(data, id) {
  // 移除舊的同 ID 腳本
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * 注入 Organization Schema（全站共用）
 */
export function injectOrganizationSchema() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: t('brand.name'),
    alternateName: t('brand.nameEn') || 'DEMO SHOP',
    url: window.location.origin,
    logo: `${window.location.origin}/favicon.svg`,
    sameAs: [
      'https://www.facebook.com/demoshop',
      'https://www.instagram.com/demoshop',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+886-2-1234-5678',
      contactType: 'customer service',
      availableLanguage: ['Chinese', 'English'],
    },
  };
  injectJsonLd(data, 'schema-organization');
}

/**
 * 注入 Product + AggregateOffer Schema
 */
export function injectProductSchema(product) {
  if (!product) return;
  const lang = getLang();

  // 計算價格範圍
  const prices = product.variants?.map(v => v.price) || [product.basePrice];
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const hasStock = product.variants?.some(v => v.inventory > 0) ?? true;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: localize(product.name),
    image: product.images?.map(img => img.src) || [],
    description: localize(product.description),
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: t('brand.name'),
    },
    aggregateRating: product.rating ? {
      '@type': 'AggregateRating',
      ratingValue: String(product.rating),
      reviewCount: String(product.reviewCount || 0),
    } : undefined,
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: String(lowPrice),
      highPrice: String(highPrice),
      priceCurrency: 'TWD',
      availability: hasStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      offerCount: String(product.variants?.length || 1),
    },
  };
  injectJsonLd(data, 'schema-product');
}

/**
 * 注入 BreadcrumbList Schema
 * @param {Array} crumbs - [{ name, url }]
 */
export function injectBreadcrumbSchema(crumbs) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url ? `${window.location.origin}${crumb.url}` : undefined,
    })),
  };
  injectJsonLd(data, 'schema-breadcrumb');
}

/**
 * 注入 FAQPage Schema
 * @param {Array} faqs - [{ q: { zh-TW, en }, a: { zh-TW, en } }]
 */
export function injectFAQSchema(faqs) {
  if (!faqs || faqs.length === 0) return;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: localize(faq.q),
      acceptedAnswer: {
        '@type': 'Answer',
        text: localize(faq.a),
      },
    })),
  };
  injectJsonLd(data, 'schema-faq');
}

/**
 * 更新 canonical URL
 */
export function updateCanonicalUrl(url) {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url || window.location.href.split('?')[0];
}

/**
 * 更新 hreflang 標籤（中/英）
 */
export function updateHreflangLinks() {
  const base = window.location.href.split('?')[0];
  const langs = [
    { hreflang: 'zh-TW', href: `${base}?lang=zh-TW` },
    { hreflang: 'en', href: `${base}?lang=en` },
    { hreflang: 'x-default', href: base },
  ];

  // 移除舊的 hreflang
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

  langs.forEach(({ hreflang, href }) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    document.head.appendChild(link);
  });
}
