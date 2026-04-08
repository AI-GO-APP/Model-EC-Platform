/**
 * 示範商城 — AI GO API Client
 * 提供 Custom App User Auth + Ext Proxy + Custom Table 存取
 * 
 * 認證方式：
 * - 前端消費者：Custom App User Token (Bearer) → /ext/* 端點
 * - 後端管理：API Key (X-API-Key) → /open/* 端點（僅限伺服器端）
 */

import { API_BASE, APP_SLUG, APP_DOMAIN, STORAGE_KEYS } from './config.js';

// 儲存 key（來自 config.js 統一管理）
const TOKEN_KEY = STORAGE_KEYS.ACCESS_TOKEN;
const REFRESH_KEY = STORAGE_KEYS.REFRESH_TOKEN;
const USER_KEY = STORAGE_KEYS.USER;
const TOKEN_EXP_KEY = STORAGE_KEYS.TOKEN_EXP;

// ============================================================
// Token 管理
// ============================================================

/** 儲存認證資訊 */
function saveAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  // 設定過期時間（提前 60 秒過期以確保安全）
  const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  localStorage.setItem(TOKEN_EXP_KEY, expiresAt.toString());
}

/** 清除認證資訊 */
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
}

/** 取得 Access Token（若即將過期自動刷新） */
async function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expStr = localStorage.getItem(TOKEN_EXP_KEY);
  if (expStr && Date.now() > parseInt(expStr, 10)) {
    // Token 即將/已過期，嘗試刷新
    const refreshed = await refreshToken();
    return refreshed ? localStorage.getItem(TOKEN_KEY) : null;
  }
  return token;
}

/** 取得快取的用戶資訊 */
export function getCachedUser() {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.debug('[api] 解析快取用戶資料失敗', e.message);
    return null;
  }
}

/** 是否已登入 */
export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}

// ============================================================
// 認證 API（公開端點，無需 API Key）
// ============================================================

/**
 * 註冊新用戶
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<{user: object}>}
 */
export async function register(email, password, displayName) {
  const res = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || '註冊失敗');
  }
  saveAuth(data);
  dispatchAuthEvent('login', data.user);
  return data;
}

/**
 * 登入
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object}>}
 */
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || '登入失敗');
  }
  saveAuth(data);
  dispatchAuthEvent('login', data.user);
  return data;
}

/**
 * 登出
 */
export async function logout() {
  const token = localStorage.getItem(TOKEN_KEY);
  const refreshTokenVal = localStorage.getItem(REFRESH_KEY);
  if (token && refreshTokenVal) {
    try {
      await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshTokenVal }),
      });
    } catch (e) {
      console.debug('[api] 登出 API 失敗，仍清除本地狀態', e.message);
    }
  }
  clearAuth();
  dispatchAuthEvent('logout', null);
}

/**
 * 取得目前用戶（從伺服器驗證 Token）
 * @returns {Promise<object>}
 */
export async function getMe() {
  const token = await getToken();
  if (!token) throw new ApiError(401, '未登入');

  const res = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      dispatchAuthEvent('logout', null);
    }
    throw new ApiError(res.status, data.detail || '取得用戶資料失敗');
  }
  // 更新快取的用戶資訊並通知全站元件
  localStorage.setItem(USER_KEY, JSON.stringify(data));
  dispatchAuthEvent('update', data);
  return data;
}

/**
 * 刷新 Token
 * @returns {Promise<boolean>}
 */
async function refreshToken() {
  const refreshTokenVal = localStorage.getItem(REFRESH_KEY);
  if (!refreshTokenVal) {
    clearAuth();
    dispatchAuthEvent('logout', null);
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTokenVal }),
    });
    if (!res.ok) {
      clearAuth();
      dispatchAuthEvent('logout', null);
      return false;
    }
    const data = await res.json();
    saveAuth(data);
    return true;
  } catch (e) {
    console.debug('[api] Token 刷新網路錯誤', e.message);
    clearAuth();
    dispatchAuthEvent('logout', null);
    return false;
  }
}

// ============================================================
// Ext Proxy API（使用 Bearer Token，前端可直接呼叫）
// ============================================================

/**
 * 通用已認證的 fetch
 */
async function authFetch(url, options = {}) {
  const token = await getToken();
  if (!token) throw new ApiError(401, '未登入');

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  // 401 = Token 無效，嘗試刷新
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // 重試一次
      const retryToken = localStorage.getItem(TOKEN_KEY);
      headers['Authorization'] = `Bearer ${retryToken}`;
      const retryRes = await fetch(url, { ...options, headers });
      if (!retryRes.ok) {
        const data = await retryRes.json().catch(() => ({}));
        throw new ApiError(retryRes.status, data.detail || `API 錯誤 ${retryRes.status}`);
      }
      return retryRes;
    } else {
      throw new ApiError(401, '登入已過期，請重新登入');
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || `API 錯誤 ${res.status}`);
  }
  return res;
}

// ============================================================
// app_domain 隔離工具（§13 Data Domain Separation）
// ============================================================

/**
 * 產生 app_domain ilike 過濾條件
 * 注意：JSONB 序列化時冒號後可能帶空格，使用寬鬆通配符確保匹配
 */
function domainFilter() {
  return { column: 'custom_data', op: 'ilike', value: `%app_domain%${APP_DOMAIN}%` };
}
/** 將 app_domain 注入 custom_data（寫入用，保留原有欄位） */
function injectDomain(customData = {}) {
  return { ...customData, app_domain: APP_DOMAIN };
}

/** Ext Proxy — 系統表操作（內建 app_domain 隔離） */
export const proxy = {
  /**
   * 查詢系統表（自動注入 app_domain 過濾）
   * @param {string} table - 表名（如 'product_templates'）
   * @param {object} [options] - 查詢參數
   * @param {number} [options.limit] - 筆數限制
   * @param {number} [options.offset] - 起始位置
   * @param {string} [options.search] - 搜尋關鍵字
   * @param {Array} [options.filters] - 過濾條件
   * @param {Array} [options.order_by] - 排序
   * @param {boolean} [options.skipDomain] - 是否跳過 domain 過濾（僅限內部遷移用）
   * @returns {Promise<Array>}
   */
  async list(table, options = {}) {
    // 自動注入 app_domain 過濾（除非明確跳過）
    const filters = [...(options.filters || [])];
    if (!options.skipDomain) {
      filters.push(domainFilter());
    }

    // 有 filters 時一律走 POST /query（更可靠）
    const body = {
      filters,
      ...(options.order_by ? { order_by: options.order_by } : {}),
      ...(options.limit ? { limit: options.limit } : {}),
      ...(options.offset ? { offset: options.offset } : {}),
      ...(options.search ? { search: options.search } : {}),
    };

    const res = await authFetch(`${API_BASE}/ext/proxy/${table}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.json();
  },

  /**
   * 取得單筆記錄 — 透過 query API 搭配 id 過濾
   * AI GO ext proxy 不支援 GET /{table}/{id}，需使用 POST /query
   * 注意：by-id 查詢不需要 domain filter（id 本身已唯一）
   */
  async get(table, id) {
    const res = await authFetch(`${API_BASE}/ext/proxy/${table}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filters: [{ column: 'id', op: 'eq', value: id }],
        limit: 1,
      }),
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] || null : data;
  },

  /**
   * 建立記錄（自動注入 app_domain 到 custom_data）
   * AI GO 回傳 { id, created_at, data: {...} }，這裡正規化為扁平物件
   */
  async create(table, payload) {
    // 自動注入 app_domain 到 custom_data
    const data = { ...payload };
    if (data.custom_data !== undefined) {
      data.custom_data = injectDomain(data.custom_data);
    } else {
      data.custom_data = injectDomain();
    }

    const res = await authFetch(`${API_BASE}/ext/proxy/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await res.json();

    // AI GO 回傳 { id, data: {欄位...} }，需要展開
    if (result && result.id && result.data) {
      return { id: result.id, ...result.data };
    }
    return result;
  },

  /**
   * 更新記錄
   * AI GO 回傳 { id, updated: true }，需要重新查詢取得完整資料
   */
  async update(table, id, data) {
    const res = await authFetch(`${API_BASE}/ext/proxy/${table}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const result = await res.json();

    // 如果更新成功，重新查詢取得完整資料
    if (result && result.updated) {
      return await this.get(table, id);
    }
    return result;
  },
};

/** Ext Proxy — 公開查詢（無需登入的產品瀏覽） */
export const publicProxy = {
  /**
   * 查詢系統表（無需登入 — 使用 open proxy 由後端代理）
   * 若用戶未登入，直接從 /open/ 端點取得公開資料
   * 由於安全限制，此方法使用 ext proxy（需登入）或 fallback 公開資料
   */
  async list(table, options = {}) {
    // 若已登入，走 ext proxy
    if (isLoggedIn()) {
      return proxy.list(table, options);
    }
    // 未登入時，利用 fetch 從本地靜態快取取得
    // 因為 API Key 不可暴露前端，未登入時使用本地 JSON 快取
    try {
      const res = await fetch(`/data/cache/${table}.json`);
      if (res.ok) {
        const all = await res.json();
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : all.length;
        return all.slice(start, end);
      }
    } catch (e) {
      console.debug('[api] 公開快取載入失敗', e.message);
    }
    return [];
  },
};

/** Custom Table API */
export const customTable = {
  /**
   * 查詢 Custom Table 記錄
   */
  async list(slug, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    const qs = params.toString();
    const res = await authFetch(`${API_BASE}/ext/data/objects/${slug}/records${qs ? '?' + qs : ''}`);
    return res.json();
  },

  /**
   * 建立記錄
   */
  async create(slug, data) {
    const res = await authFetch(`${API_BASE}/ext/data/objects/${slug}/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * 更新記錄
   */
  async update(slug, recordId, data) {
    const res = await authFetch(`${API_BASE}/ext/data/objects/${slug}/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * 刪除記錄
   */
  async delete(slug, recordId) {
    const res = await authFetch(`${API_BASE}/ext/data/objects/${slug}/records/${recordId}`, {
      method: 'DELETE',
    });
    return res.status === 204;
  },
};

// ============================================================
// 工具函數
// ============================================================

/** API 錯誤類別 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** 發送認證事件 */
function dispatchAuthEvent(type, user) {
  window.dispatchEvent(new CustomEvent('authChange', { detail: { type, user } }));
}

/**
 * Auth Guard — 檢查是否已登入，未登入則導向登入頁
 * @param {string} [redirectUrl] - 登入後導回的 URL
 * @returns {boolean}
 */
export function requireAuth(redirectUrl) {
  if (!isLoggedIn()) {
    const target = redirectUrl || window.location.pathname;
    window.location.href = `/account.html?redirect=${encodeURIComponent(target)}&action=login`;
    return false;
  }
  return true;
}

