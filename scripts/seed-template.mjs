/**
 * 通用資料注入腳本模板
 *
 * 用途：複製此檔案並修改 PRODUCTS / ORDERS 陣列，即可將自訂商品與訂單注入目標租戶
 * 執行：node scripts/seed-template.mjs
 * 前置：.env 已設定 VITE_API_BASE 和 AIGO_API_KEY（可用 switch-tenant.sh 自動產生）
 *
 * 詳細欄位定義請見 docs/tenant-integration-guide.md §A.4
 */
import 'dotenv/config';

const API_BASE = process.env.VITE_API_BASE;
const API_KEY  = process.env.AIGO_API_KEY;

/** 資料隔離標識 — 與 src/js/utils/config.js 保持一致 */
const APP_DOMAIN = process.env.VITE_APP_DOMAIN || 'ec-platform';

if (!API_BASE || !API_KEY) {
  console.error('❌ 需要 VITE_API_BASE 和 AIGO_API_KEY 環境變數');
  console.error('💡 請先執行 switch-tenant.sh 或手動建立 .env');
  process.exit(1);
}

// ============================================================
// 通用 API 工具
// ============================================================

/**
 * 透過 Open Proxy 建立一筆記錄
 * @param {string} table - 表名（如 'product_templates'）
 * @param {object} data - payload
 * @returns {Promise<{id: string, ...}>}
 */
async function createRecord(table, data) {
  const res = await fetch(`${API_BASE}/open/proxy/${table}`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(result).substring(0, 200)}`);
  }
  // 正規化回傳格式（AI GO 可能回傳 { id, data: {...} } 或扁平物件）
  return (result && result.id && result.data)
    ? { id: result.id, ...result.data }
    : result;
}

/**
 * 透過 Open Proxy 查詢記錄
 */
async function queryRecords(table, filters = [], limit = 200) {
  const res = await fetch(`${API_BASE}/open/proxy/${table}/query`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filters, limit }),
  });
  if (!res.ok) throw new Error(`Query ${table} failed: ${res.status}`);
  return res.json();
}

/**
 * 檢查是否已存在相同 default_code 的商品（冪等性檢查）
 */
async function productExists(defaultCode) {
  if (!defaultCode) return false;
  const results = await queryRecords('product_templates', [
    { column: 'default_code', op: 'eq', value: defaultCode },
    { column: 'custom_data', op: 'ilike', value: `%app_domain%${APP_DOMAIN}%` },
  ], 1);
  return results.length > 0;
}

// ============================================================
// 商品資料（請自行替換）
// ============================================================

const PRODUCTS = [
  {
    name: '範例商品 A',
    type: 'consu',           // consu | service | product
    list_price: 1000,
    sale_ok: true,
    active: true,
    description_sale: '範例銷售說明',
    default_code: 'SAMPLE-001',   // SKU（建議唯一，用於冪等檢查）
    // image_url: '/images/products/sample.png',
    custom_data: {
      app_domain: APP_DOMAIN,
      // ── 以下為 EC Platform 前端會讀取的欄位 ──
      name_en: 'Sample Product A',
      description_en: 'Sample description',
      category_display: '分類名稱',
      category_en: 'Category',
      tags: ['新品'],
      colors: [
        { name: '黑色', hex: '#2D3436', available: true },
      ],
      // sizes: ['S', 'M', 'L'],
      rating: 4.5,
      review_count: 0,
      material: '範例材質',
    },
  },
  // ... 複製上方結構，新增更多商品 ...
];

// ============================================================
// 訂單資料（可選，請自行替換）
// ============================================================

const ORDERS = [
  // 取消註解以啟用訂單注入：
  // {
  //   // ── AI GO 系統表欄位 ──
  //   state: 'draft',                    // draft | sent | sale | done | cancel
  //   date_order: '2026-04-09',          // YYYY-MM-DD（NOT NULL，必填！）
  //   amount_total: 1080,                // 含運費總計
  //   amount_untaxed: 1000,              // 未稅金額
  //   invoice_status: 'no',              // no | to_invoice | invoiced
  //   note: '測試訂單備註',
  //
  //   // ── custom_data：EC Platform 前端讀取的欄位 ──
  //   custom_data: {
  //     app_domain: APP_DOMAIN,
  //     customer_name: '王小明',
  //     customer_phone: '0912-345-678',
  //     customer_email: 'test@example.com',
  //     shipping_address: '10617 台北市大安區敦化南路 100 號',
  //     shipping_method: 'home',         // home | 711 | family | hilife | post
  //     shipping_fee: 80,
  //     invoice_type: 'mobile',          // mobile | citizen | donation | business
  //     payment_method: 'credit',        // credit | transfer | cod
  //     order_date: new Date().toISOString(),
  //     items: [
  //       {
  //         product_id: 'uuid-of-product',
  //         name: '範例商品 A',
  //         quantity: 1,
  //         unit_price: 1000,
  //         subtotal: 1000,
  //       },
  //     ],
  //   },
  //
  //   // ── 訂單明細（會建立為 sale_order_lines）──
  //   lines: [
  //     { name: '範例商品 A', qty: 1, unit_price: 1000 },
  //   ],
  // },
];

// ============================================================
// 客戶資料（可選）
// ============================================================

const CUSTOMERS = [
  // {
  //   name: '王小明',
  //   email: 'wang@example.com',
  //   phone: '0912-345-678',
  //   customer_type: 'individual',
  //   custom_data: {
  //     app_domain: APP_DOMAIN,
  //     source: 'ec-website',
  //   },
  // },
];

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  EC Platform — 通用資料注入                  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n  API Base   : ${API_BASE}`);
  console.log(`  App Domain : ${APP_DOMAIN}`);
  console.log(`  商品數     : ${PRODUCTS.length}`);
  console.log(`  訂單數     : ${ORDERS.length}`);
  console.log(`  客戶數     : ${CUSTOMERS.length}`);

  let created = 0, skipped = 0, failed = 0;

  // ── 1. 注入商品 ──
  if (PRODUCTS.length > 0) {
    console.log('\n📦 注入商品...');
    for (const product of PRODUCTS) {
      try {
        // 冪等性檢查
        if (product.default_code && await productExists(product.default_code)) {
          console.log(`  ⏭️  ${product.name} (${product.default_code}) — 已存在，跳過`);
          skipped++;
          continue;
        }
        const result = await createRecord('product_templates', product);
        console.log(`  ✅ ${product.name} (${product.default_code || '-'}) — ID: ${result.id}`);
        created++;
      } catch (e) {
        console.log(`  ❌ ${product.name} — ${e.message}`);
        failed++;
      }
    }
  }

  // ── 2. 注入客戶 ──
  if (CUSTOMERS.length > 0) {
    console.log('\n👤 注入客戶...');
    for (const customer of CUSTOMERS) {
      try {
        const result = await createRecord('customers', customer);
        console.log(`  ✅ ${customer.name} — ID: ${result.id}`);
        created++;
      } catch (e) {
        console.log(`  ❌ ${customer.name} — ${e.message}`);
        failed++;
      }
    }
  }

  // ── 3. 注入訂單 + 明細 ──
  if (ORDERS.length > 0) {
    console.log('\n📋 注入訂單...');
    for (const order of ORDERS) {
      try {
        const { lines, ...orderData } = order;
        const result = await createRecord('sale_orders', orderData);
        console.log(`  ✅ 訂單 — ID: ${result.id}`);
        created++;

        // 建立訂單明細
        for (const line of (lines || [])) {
          try {
            await createRecord('sale_order_lines', {
              order_id: result.id,
              name: line.name,
              product_uom_qty: line.qty,
              price_unit: line.unit_price,
              price_total: line.qty * line.unit_price,
              custom_data: { app_domain: APP_DOMAIN },
            });
            console.log(`    ✅ 明細：${line.name}`);
            created++;
          } catch (e) {
            console.log(`    ❌ 明細 ${line.name} — ${e.message}`);
            failed++;
          }
        }
      } catch (e) {
        console.log(`  ❌ 訂單 — ${e.message}`);
        failed++;
      }
    }
  }

  // ── 4. 驗證 ──
  console.log('\n📊 驗證...');
  try {
    const products = await queryRecords('product_templates', [
      { column: 'custom_data', op: 'ilike', value: `%app_domain%${APP_DOMAIN}%` },
    ]);
    console.log(`  商品總數（${APP_DOMAIN}）：${products.length} 筆`);
  } catch (e) {
    console.log(`  ⚠️ 驗證查詢失敗：${e.message}`);
  }

  // ── 結果 ──
  console.log('\n════════════════════════════════════════════════');
  console.log(`📊 結果：${created} 建立 / ${skipped} 跳過 / ${failed} 失敗`);
  console.log('════════════════════════════════════════════════');

  if (failed > 0) {
    console.log(`\n⚠️ 有 ${failed} 筆記錄注入失敗，請檢查上方錯誤訊息`);
    process.exit(1);
  } else {
    console.log('\n✅ 所有資料注入成功！');
  }
}

main().catch(e => {
  console.error('❌ 執行失敗:', e.message);
  process.exit(1);
});
