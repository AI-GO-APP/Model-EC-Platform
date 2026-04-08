/**
 * AI GO 整合引用建立腳本
 * 為示範商城電商平台建立所有必要的系統表引用
 */
import 'dotenv/config';

const API_BASE = process.env.VITE_API_BASE || 'https://ai-go.app/api/v1';
const APP_ID = process.env.AIGO_APP_ID;
const APP_SLUG = process.env.VITE_APP_SLUG;
const API_KEY = process.env.AIGO_API_KEY;
const BUILDER_EMAIL = process.env.AIGO_BUILDER_EMAIL;
const BUILDER_PASSWORD = process.env.AIGO_BUILDER_PASSWORD;

if (!API_KEY || !APP_ID) {
  console.error('❗ 請在 .env 中設定 AIGO_API_KEY 和 AIGO_APP_ID');
  process.exit(1);
}

// 需要建立引用的系統表
const REFERENCES = [
  {
    table_name: 'product_templates',
    columns: ['id', 'name', 'type', 'list_price', 'standard_price', 'sale_ok', 'active', 'description_sale', 'categ_id', 'image_url', 'default_code', 'custom_data'],
    permissions: ['read', 'create', 'update'],
  },
  {
    table_name: 'product_products',
    columns: ['id', 'product_tmpl_id', 'default_code', 'active', 'custom_data'],
    permissions: ['read'],
  },
  {
    table_name: 'product_categories',
    columns: ['id', 'name', 'parent_id', 'custom_data'],
    permissions: ['read'],
  },
  {
    table_name: 'customers',
    columns: ['id', 'name', 'email', 'phone', 'customer_type', 'status', 'custom_data'],
    permissions: ['read', 'create', 'update'],
  },
  {
    table_name: 'sale_orders',
    columns: ['id', 'name', 'customer_id', 'state', 'date_order', 'amount_total', 'amount_untaxed', 'carrier_type', 'invoice_format', 'delivery_method', 'tax_type', 'note', 'invoice_status', 'custom_data'],
    permissions: ['read', 'create', 'update'],
  },
  {
    table_name: 'sale_order_lines',
    columns: ['id', 'order_id', 'product_id', 'name', 'product_uom_qty', 'price_unit', 'price_total', 'custom_data'],
    permissions: ['read', 'create'],
  },
  {
    table_name: 'stock_quants',
    columns: ['id', 'product_id', 'location_id', 'quantity', 'reserved_quantity'],
    permissions: ['read'],
  },
  {
    table_name: 'stock_pickings',
    columns: ['id', 'name', 'state', 'origin', 'picking_type_id', 'custom_data'],
    permissions: ['read', 'create', 'update'],
  },
  {
    table_name: 'stock_moves',
    columns: ['id', 'name', 'product_id', 'product_uom_qty', 'state', 'picking_id', 'custom_data'],
    permissions: ['read', 'create', 'update'],
  },
  {
    table_name: 'sale_stock_links',
    columns: ['id', 'sale_order_id', 'picking_id'],
    permissions: ['read', 'create'],
  },
  {
    table_name: 'account_moves',
    columns: ['id', 'name', 'move_type', 'state', 'amount_total', 'payment_state', 'custom_data'],
    permissions: ['read', 'create'],
  },
];

async function main() {
  console.log('=== 示範商城 AI GO 引用建立腳本 ===\n');

  // Step 1: 取得 Builder JWT
  console.log('Step 1: 取得 Builder JWT...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: BUILDER_EMAIL, password: BUILDER_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error('❌ Builder 登入失敗:', loginRes.status, await loginRes.text());
    return;
  }
  const { access_token: jwt } = await loginRes.json();
  console.log('✅ Builder JWT 取得成功\n');

  // Step 2: 查看現有引用
  console.log('Step 2: 查看現有引用...');
  const existingRefsRes = await fetch(`${API_BASE}/refs/apps/${APP_ID}`, {
    headers: { 'Authorization': `Bearer ${jwt}` },
  });
  const existingRefs = await existingRefsRes.json();
  const existingTables = Array.isArray(existingRefs) 
    ? existingRefs.map(r => r.table_name)
    : [];
  console.log(`  現有引用: ${existingTables.length > 0 ? existingTables.join(', ') : '(無)'}\n`);

  // Step 3: 建立引用
  console.log('Step 3: 建立系統表引用...');
  const results = [];

  for (const ref of REFERENCES) {
    if (existingTables.includes(ref.table_name)) {
      console.log(`  ⏭️  ${ref.table_name} — 已存在，跳過`);
      results.push({ table: ref.table_name, status: 'exists' });
      continue;
    }

    const res = await fetch(`${API_BASE}/refs/apps/${APP_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ref),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`  ✅ ${ref.table_name} — 建立成功 (columns: ${ref.columns.length}, perms: ${ref.permissions.join('+')})`);
      results.push({ table: ref.table_name, status: 'created', id: data.id });
    } else {
      console.log(`  ❌ ${ref.table_name} — 失敗: ${JSON.stringify(data)}`);
      results.push({ table: ref.table_name, status: 'error', error: data });
    }
  }

  console.log('');

  // Step 4: Publish
  console.log('Step 4: 發布引用...');
  const publishRes = await fetch(`${API_BASE}/integrations/${APP_ID}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: '示範商城電商整合：建立產品/訂單/庫存/客戶引用' }),
  });
  const publishData = await publishRes.json();
  if (publishRes.ok) {
    console.log('✅ 發布成功!\n');
  } else {
    console.log(`❌ 發布失敗: ${JSON.stringify(publishData)}\n`);
  }

  // Step 5: 驗證 Open Proxy 存取
  console.log('Step 5: 驗證 Open Proxy 存取...');
  for (const ref of REFERENCES) {
    try {
      const proxyRes = await fetch(`${API_BASE}/open/proxy/${ref.table_name}?limit=1`, {
        headers: { 'X-API-Key': API_KEY },
      });
      const status = proxyRes.status;
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        const count = Array.isArray(data) ? data.length : '?';
        console.log(`  ✅ ${ref.table_name} — HTTP ${status} (${count} 筆)`);
      } else {
        const err = await proxyRes.text();
        console.log(`  ❌ ${ref.table_name} — HTTP ${status}: ${err.substring(0, 80)}`);
      }
    } catch (e) {
      console.log(`  ❌ ${ref.table_name} — 網路錯誤: ${e.message}`);
    }
  }

  // Step 6: 驗證 Custom App Auth
  console.log('\nStep 6: 驗證 Custom App Auth...');
  
  // 6a: 註冊測試用戶
  const testEmail = `e2e_test_${Date.now()}@test.com`;
  const regRes = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'E2eTest123!', display_name: 'E2E Test' }),
  });
  if (regRes.ok) {
    const regData = await regRes.json();
    console.log(`  ✅ 註冊成功 — user_id: ${regData.user.id}`);
    
    // 6b: 用 Bearer Token 存取 /ext/proxy/
    const userToken = regData.access_token;
    for (const table of ['product_templates', 'customers', 'sale_orders']) {
      try {
        const extRes = await fetch(`${API_BASE}/ext/proxy/${table}?limit=1`, {
          headers: { 'Authorization': `Bearer ${userToken}` },
        });
        const status = extRes.status;
        if (extRes.ok) {
          const data = await extRes.json();
          const count = Array.isArray(data) ? data.length : '?';
          console.log(`  ✅ /ext/proxy/${table} — HTTP ${status} (${count} 筆)`);
        } else {
          const err = await extRes.text();
          console.log(`  ❌ /ext/proxy/${table} — HTTP ${status}: ${err.substring(0, 80)}`);
        }
      } catch (e) {
        console.log(`  ❌ /ext/proxy/${table} — ${e.message}`);
      }
    }

    // 6c: Custom Table
    const ctRes = await fetch(`${API_BASE}/ext/data/objects`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    if (ctRes.ok) {
      const ct = await ctRes.json();
      console.log(`  ✅ /ext/data/objects — ${Array.isArray(ct) ? ct.length : 0} 個 Custom Table`);
    }
  } else {
    console.log(`  ❌ 註冊失敗: ${regRes.status} ${await regRes.text()}`);
  }

  // 完成
  console.log('\n=== 完成 ===');
  const created = results.filter(r => r.status === 'created').length;
  const existed = results.filter(r => r.status === 'exists').length;
  const failed = results.filter(r => r.status === 'error').length;
  console.log(`引用: ${created} 新建 / ${existed} 已存在 / ${failed} 失敗`);
}

main().catch(console.error);
