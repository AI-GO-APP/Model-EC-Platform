/**
 * 示範商城 — AI GO API E2E 端到端測試
 * 100% 覆蓋所有使用到的 endpoint 的 CRUD 操作
 *
 * 測試範圍：
 * 1. Custom App Auth：register / login / me / refresh / logout
 * 2. Ext Proxy — product_templates：list / get
 * 3. Ext Proxy — sale_orders：list / create / update / get
 * 4. Ext Proxy — sale_order_lines：list / create
 * 5. Ext Proxy — customers：list
 * 6. Ext Proxy — stock_quants：list
 * 7. Open Proxy（API Key）：product_templates list
 * 8. Proxy Query（POST 進階查詢）
 */
import 'dotenv/config';

const API_BASE = process.env.VITE_API_BASE || 'https://ai-go.app/api/v1';
const APP_SLUG = process.env.VITE_APP_SLUG;
const API_KEY = process.env.AIGO_API_KEY;

/** App Domain 標識（與 src/js/utils/config.js 保持一致） */
const APP_DOMAIN = 'ec-platform';

if (!APP_SLUG || !API_KEY) {
  console.error('❗ 請在 .env 中設定 VITE_APP_SLUG 和 AIGO_API_KEY');
  process.exit(1);
}

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
    errors.push(msg);
  }
}

// ============================================================
// 1. Custom App Auth
// ============================================================

async function testAuth() {
  console.log('\n=== 1. Custom App Auth ===');

  const testEmail = `e2e_api_${Date.now()}@test.com`;
  const testPassword = 'E2eTest_123!';
  const testName = 'E2E API Test';

  // 1a. Register
  console.log('\n1a. Register');
  const regRes = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, display_name: testName }),
  });
  const regData = await regRes.json();
  assert(regRes.status === 201, `註冊回傳 201 (實際: ${regRes.status})`);
  assert(!!regData.access_token, '回傳 access_token');
  assert(!!regData.refresh_token, '回傳 refresh_token');
  assert(typeof regData.expires_in === 'number', `expires_in 是數字 (${regData.expires_in})`);
  assert(regData.user?.email === testEmail, `user.email 正確 (${regData.user?.email})`);
  assert(regData.user?.display_name === testName, `user.display_name 正確`);
  assert(!!regData.user?.id, `user.id 存在 (${regData.user?.id})`);

  const accessToken = regData.access_token;
  const refreshToken = regData.refresh_token;
  const userId = regData.user?.id;

  // 1b. Login
  console.log('\n1b. Login');
  const loginRes = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, `登入回傳 200 (實際: ${loginRes.status})`);
  assert(!!loginData.access_token, '登入回傳 access_token');
  assert(loginData.user?.id === userId, 'user.id 與註冊一致');

  const loginToken = loginData.access_token;
  const loginRefreshToken = loginData.refresh_token;

  // 1c. Me
  console.log('\n1c. Me');
  const meRes = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/me`, {
    headers: { 'Authorization': `Bearer ${loginToken}` },
  });
  const meData = await meRes.json();
  assert(meRes.status === 200, `Me 回傳 200 (實際: ${meRes.status})`);
  assert(meData.email === testEmail, `Me email 正確`);
  assert(meData.id === userId, 'Me userId 一致');

  // 1d. Refresh
  console.log('\n1d. Refresh');
  const refreshRes = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: loginRefreshToken }),
  });
  const refreshData = await refreshRes.json();
  assert(refreshRes.status === 200, `Refresh 回傳 200 (實際: ${refreshRes.status})`);
  assert(!!refreshData.access_token, 'Refresh 回傳新 access_token');
  assert(!!refreshData.refresh_token, 'Refresh 回傳新 refresh_token (token rotation)');

  const freshToken = refreshData.access_token;

  // 1e. Logout
  console.log('\n1e. Logout');
  const logoutRes = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${freshToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshData.refresh_token }),
  });
  assert(logoutRes.status === 200, `Logout 回傳 200 (實際: ${logoutRes.status})`);

  // 回傳剛 refresh 得到的新 token 進行後續測試
  // 註冊一個全新帳號用於後續 proxy 測試
  const freshEmail = `e2e_proxy_${Date.now()}@test.com`;
  const fr = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: freshEmail, password: testPassword, display_name: 'E2E Proxy' }),
  });
  const freshData = await fr.json();
  return { token: freshData.access_token, userId: freshData.user?.id, email: freshEmail };
}

// ============================================================
// 2. Ext Proxy — product_templates
// ============================================================

async function testProductTemplates(token) {
  console.log('\n=== 2. Ext Proxy — product_templates ===');

  // 2a. List
  console.log('\n2a. List');
  const listRes = await fetch(`${API_BASE}/ext/proxy/product_templates?limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const products = await listRes.json();
  assert(listRes.status === 200, `List 回傳 200`);
  assert(Array.isArray(products), '回傳陣列');
  assert(products.length > 0, `有商品 (${products.length} 筆)`);

  // 驗證欄位
  const p = products[0];
  assert('id' in p, '有 id 欄位');
  assert('name' in p, '有 name 欄位');
  assert('list_price' in p, '有 list_price 欄位');
  assert('type' in p, `有 type 欄位 (${p.type})`);
  assert('image_url' in p, '有 image_url 欄位');
  assert('custom_data' in p, '有 custom_data 欄位');
  assert(typeof p.custom_data === 'object', 'custom_data 是物件');
  assert(p.custom_data?.app_domain === APP_DOMAIN, `app_domain 為 '${APP_DOMAIN}' (實際: ${p.custom_data?.app_domain})`);

  // 2b. Get (單筆 — 使用 query API)
  console.log('\n2b. Get (透過 query)');
  const getRes = await fetch(`${API_BASE}/ext/proxy/product_templates/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters: [{ column: 'id', op: 'eq', value: p.id }],
      limit: 1,
    }),
  });
  const getResult = await getRes.json();
  const detail = Array.isArray(getResult) ? getResult[0] : getResult;
  assert(getRes.status === 200, `Get (query) 回傳 200`);
  assert(detail?.id === p.id, 'Get 回傳正確 ID');
  assert(detail?.name === p.name, 'Get 回傳正確 name');

  return p.id; // 回傳商品 ID 供後續測試
}

// ============================================================
// 3. Ext Proxy — sale_orders CRUD
// ============================================================

async function testSaleOrders(token, userId, productId) {
  console.log('\n=== 3. Ext Proxy — sale_orders CRUD ===');

  // 3a. Create — 使用文件定義的合法 enum 值
  console.log('\n3a. Create');
  const createRes = await fetch(`${API_BASE}/ext/proxy/sale_orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state: 'draft',          // §8.4 enum: draft|sent|sale|done|cancel
      date_order: new Date().toISOString().split('T')[0], // YYYY-MM-DD（必填 NOT NULL）
      amount_total: 2980,
      amount_untaxed: 2980,
      note: 'E2E API 測試訂單',
      invoice_status: 'no',    // §8.4 enum: no|to_invoice|invoiced
      custom_data: {
        app_domain: APP_DOMAIN,
        user_id: userId,
        customer_name: 'E2E Bot',
        customer_email: 'e2e@test.com',
        customer_phone: '0912-345-678',
        shipping_address: '10617 台北市 測試路 100 號',
        shipping_method: 'home',
        shipping_fee: 0,
        invoice_type: 'mobile',
        payment_method: 'credit',
        order_date: new Date().toISOString(),
        items: [{
          product_id: productId,
          name: 'E2E 測試商品',
          quantity: 1,
          unit_price: 2980,
          subtotal: 2980,
        }],
      },
    }),
  });
  const createResult = await createRes.json();
  // AI GO Create 回傳 { id, data: {...} } 或直接物件
  const order = (createResult && createResult.id && createResult.data)
    ? { id: createResult.id, ...createResult.data }
    : createResult;
  assert(createRes.status === 200 || createRes.status === 201, `Create 回傳 ${createRes.status}`);
  assert(!!order.id, `回傳 order.id (${order.id})`);
  // state 和 invoice_status 可能在 data 中或被澾掉，檢查 id 即可
  const orderId = order.id;

  // 3b. Get (query)
  console.log('\n3b. Get (query)');
  const getOrderRes = await fetch(`${API_BASE}/ext/proxy/sale_orders/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters: [{ column: 'id', op: 'eq', value: orderId }],
      limit: 1,
    }),
  });
  const orderQueryResult = await getOrderRes.json();
  const fetched = Array.isArray(orderQueryResult) ? orderQueryResult[0] : orderQueryResult;
  assert(getOrderRes.status === 200, `Get (query) 回傳 200`);
  assert(fetched?.id === orderId, 'Get 回傳正確 ID');
  assert(fetched?.custom_data?.user_id === userId, 'custom_data.user_id 正確');
  assert(fetched?.custom_data?.app_domain === APP_DOMAIN, `custom_data.app_domain 正確 (實際: ${fetched?.custom_data?.app_domain})`);
  assert(fetched?.state === 'draft', `state 已寫入為 draft (實際: ${fetched?.state})`);
  assert(fetched?.amount_total === 2980, `amount_total 已寫入為 2980 (實際: ${fetched?.amount_total})`);

  // 3c. Update（變更 note，避免 state 變更可能的權限問題）
  console.log('\n3c. Update');
  const updateRes = await fetch(`${API_BASE}/ext/proxy/sale_orders/${orderId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: 'E2E 更新測試' }),
  });
  const updateResult = await updateRes.json();
  assert(updateRes.status === 200, `Update 回傳 200 (實際: ${updateRes.status})`);
  assert(updateResult.updated === true || updateResult.id === orderId, `Update 成功`);

  // 3d. List
  console.log('\n3d. List');
  const listRes = await fetch(`${API_BASE}/ext/proxy/sale_orders?limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const orders = await listRes.json();
  assert(listRes.status === 200, `List 回傳 200`);
  assert(Array.isArray(orders), '回傳陣列');
  assert(orders.some(o => o.id === orderId), '列表中包含剛建立的訂單');

  return orderId;
}

// ============================================================
// 4. Ext Proxy — sale_order_lines
// ============================================================

async function testSaleOrderLines(token, orderId, productId) {
  console.log('\n=== 4. Ext Proxy — sale_order_lines ===');

  // 4a. Create — 使用 AI GO 實際欄位 (order_id, product_id, name, price_unit, price_total, custom_data)
  console.log('\n4a. Create');
  const createRes = await fetch(`${API_BASE}/ext/proxy/sale_order_lines`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      order_id: orderId,
      name: 'E2E 測試商品明細',
      product_uom_qty: 1,
      price_unit: 2980,
      price_total: 2980,
      custom_data: {
        app_domain: APP_DOMAIN,
        product_template_id: productId,
        variant: null,
      },
    }),
  });
  const createLineResult = await createRes.json();
  const line = (createLineResult && createLineResult.id && createLineResult.data)
    ? { id: createLineResult.id, ...createLineResult.data }
    : createLineResult;
  assert(createRes.status === 200 || createRes.status === 201, `Create 回傳 ${createRes.status}`);
  assert(!!line.id, `回傳 line.id (${line.id})`);

  // 4b. List
  console.log('\n4b. List');
  const listRes = await fetch(`${API_BASE}/ext/proxy/sale_order_lines?limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const lines = await listRes.json();
  assert(listRes.status === 200, `List 回傳 200`);
  assert(Array.isArray(lines), '回傳陣列');
}

// ============================================================
// 5. Ext Proxy — customers, stock_quants
// ============================================================

async function testOtherTables(token) {
  console.log('\n=== 5. Ext Proxy — customers + stock_quants ===');

  // 5a. customers
  const custRes = await fetch(`${API_BASE}/ext/proxy/customers?limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(custRes.status === 200, `customers List 回傳 200`);

  // 5b. stock_quants
  const stockRes = await fetch(`${API_BASE}/ext/proxy/stock_quants?limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(stockRes.status === 200, `stock_quants List 回傳 200`);
}

// ============================================================
// 6. Open Proxy（API Key）
// ============================================================

async function testOpenProxy() {
  console.log('\n=== 6. Open Proxy (API Key) ===');

  const res = await fetch(`${API_BASE}/open/proxy/product_templates?limit=3`, {
    headers: { 'X-API-Key': API_KEY },
  });
  const data = await res.json();
  assert(res.status === 200, `Open Proxy 回傳 200`);
  assert(Array.isArray(data), '回傳陣列');
  assert(data.length > 0, `有資料 (${data.length} 筆)`);

  // 驗證 image_url 欄位（文件確認存在）
  if (data[0]) {
    assert('image_url' in data[0], `有 image_url 欄位`);
    assert('default_code' in data[0], `有 default_code 欄位`);
  }
}

// ============================================================
// 7. Proxy Query（POST 進階查詢）
// ============================================================

async function testProxyQuery(token) {
  console.log('\n=== 7. Proxy Query (POST 進階查詢) ===');

  const queryRes = await fetch(`${API_BASE}/ext/proxy/product_templates/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: 3,
      order_by: [{ column: 'list_price', direction: 'desc' }],
    }),
  });
  const results = await queryRes.json();
  assert(queryRes.status === 200, `Query 回傳 200 (實際: ${queryRes.status})`);
  assert(Array.isArray(results), '回傳陣列');

  if (results.length >= 2) {
    assert(results[0].list_price >= results[1].list_price, '排序正確（降序）');
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   示範商城 — AI GO API E2E 端到端測試       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\nAPI Base: ${API_BASE}`);
  console.log(`App Slug: ${APP_SLUG}`);

  try {
    // 1. Auth
    const { token, userId, email } = await testAuth();

    // 使用 testAuth 回傳的 fresh token
    const freshToken = token;

    // 2. Product Templates
    const productId = await testProductTemplates(freshToken);

    // 3. Sale Orders
    const orderId = await testSaleOrders(freshToken, userId, productId);

    // 4. Sale Order Lines
    await testSaleOrderLines(freshToken, orderId, productId);

    // 5. Other Tables
    await testOtherTables(freshToken);

    // 6. Open Proxy
    await testOpenProxy();

    // 7. Query
    await testProxyQuery(freshToken);

  } catch (err) {
    console.error('\n💥 測試中斷：', err);
    failed++;
    errors.push(`測試中斷: ${err.message}`);
  }

  // 結果
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  結果：${passed} 通過 / ${failed} 失敗                     ║`);
  console.log('╚══════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\n失敗項目：');
    errors.forEach(e => console.log(`  • ${e}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
