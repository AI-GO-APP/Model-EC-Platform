/**
 * 示範商城 — 全域設定
 * 統一管理環境變數、商業常數與共用配置
 */

// ============================================================
// 環境變數（Vite 透過 import.meta.env 注入 VITE_ 前綴變數）
// ============================================================

/** AI GO API 基底 URL */
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://ai-go.app/api/v1';

/** Custom App Slug（12 字元十六進位） */
export const APP_SLUG = import.meta.env.VITE_APP_SLUG || '';

// ============================================================
// 商業常數
// ============================================================

/** 免運門檻（NT$） */
export const FREE_SHIPPING_THRESHOLD = 1500;

/** 物流運費表（NT$） */
export const SHIPPING_COSTS = {
  home: 80,    // 宅配到府
  '711': 60,   // 7-ELEVEN
  family: 60,  // 全家
  hilife: 60,  // 萊爾富
  post: 70,    // 郵局
};

/** 幣別設定 */
export const CURRENCY = {
  'zh-TW': { symbol: 'NT$', code: 'TWD', locale: 'zh-TW' },
  'en':    { symbol: 'USD $', code: 'USD', locale: 'en-US' },
};

// ============================================================
// AI GO sale_orders 欄位 enum（依據 §8.4 文件）
// ============================================================

/** sale_orders.state 可用值 */
export const ORDER_STATE = {
  DRAFT: 'draft',
  SENT: 'sent',
  SALE: 'sale',
  DONE: 'done',
  CANCEL: 'cancel',
};

/** sale_orders.invoice_status 可用值 */
export const INVOICE_STATUS = {
  NO: 'no',
  TO_INVOICE: 'to_invoice',
  INVOICED: 'invoiced',
};

// ============================================================
// localStorage key 前綴
// ============================================================

const PREFIX = 'demoshop_';
export const STORAGE_KEYS = {
  ACCESS_TOKEN: `${PREFIX}access_token`,
  REFRESH_TOKEN: `${PREFIX}refresh_token`,
  USER: `${PREFIX}user`,
  TOKEN_EXP: `${PREFIX}token_exp`,
  CART: `${PREFIX}cart`,
  WISHLIST: `${PREFIX}wishlist`,
  LANG: `${PREFIX}lang`,
};
