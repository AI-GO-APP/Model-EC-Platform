/**
 * 示範商城 — app_domain 資料回補腳本
 * 對已寫入 AI GO 的 product_templates、sale_orders、sale_order_lines
 * 補注入 custom_data.app_domain = 'ec-platform'
 *
 * 使用 Custom App Auth 登入取得 Bearer Token → ext proxy PATCH
 * 執行：node scripts/migrate-app-domain.mjs
 */

import 'dotenv/config';

const API_BASE = process.env.VITE_API_BASE;
const APP_SLUG = process.env.VITE_APP_SLUG;
const API_KEY = process.env.AIGO_API_KEY;
const APP_DOMAIN = 'ec-platform';

// 遷移用帳號（需事先在 Custom App 註冊過）
const MIGRATE_EMAIL = process.env.MIGRATE_EMAIL || 'e2e-staging-test-001@test.com';
const MIGRATE_PASSWORD = process.env.MIGRATE_PASSWORD || 'Test@12345678!';

if (!API_BASE || !APP_SLUG || !API_KEY) {
  console.error('❌ 需要 VITE_API_BASE、VITE_APP_SLUG 和 AIGO_API_KEY 環境變數');
  process.exit(1);
}

/**
 * 步驟 1：透過 Custom App Auth 登入取得 Bearer Token
 */
async function getToken() {
  const res = await fetch(`${API_BASE}/custom-app-auth/${APP_SLUG}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MIGRATE_EMAIL, password: MIGRATE_PASSWORD }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`登入失敗 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * 步驟 2：透過 Open Proxy (API Key) 拉取全部記錄
 * Open Proxy 有讀取權限但不一定有寫入權限
 */
async function listAll(tableName) {
  const res = await fetch(`${API_BASE}/open/proxy/${tableName}?limit=500`, {
    headers: { 'X-API-Key': API_KEY },
  });
  if (!res.ok) {
    console.error(`  ❌ 拉取 ${tableName} 失敗: ${res.status}`);
    return [];
  }
  return res.json();
}

/**
 * 步驟 3：透過 ext proxy (Bearer Token) PATCH 更新記錄
 */
async function patchRecord(token, tableName, id, newCustomData) {
  const res = await fetch(`${API_BASE}/ext/proxy/${tableName}/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ custom_data: newCustomData }),
  });
  return res;
}

/**
 * 對指定表的所有記錄補注入 app_domain
 */
async function migrateTable(token, tableName) {
  console.log(`\n=== 遷移 ${tableName} ===`);

  const records = await listAll(tableName);
  console.log(`  📋 共 ${records.length} 筆記錄`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records) {
    const cd = record.custom_data || {};

    // 已有 app_domain 的跳過
    if (cd.app_domain === APP_DOMAIN) {
      skipped++;
      continue;
    }

    // 合併 custom_data（保留原有欄位 + 加入 app_domain）
    const newCustomData = { ...cd, app_domain: APP_DOMAIN };

    try {
      const patchRes = await patchRecord(token, tableName, record.id, newCustomData);

      if (patchRes.ok) {
        migrated++;
        const name = record.name || record.id;
        console.log(`  ✅ ${name} — 已注入 app_domain`);
      } else {
        failed++;
        const err = await patchRes.text();
        console.log(`  ❌ ${record.id} — PATCH 失敗: ${patchRes.status} ${err.substring(0, 120)}`);
      }
    } catch (e) {
      failed++;
      console.log(`  ❌ ${record.id} — 網路錯誤: ${e.message}`);
    }
  }

  console.log(`  📊 結果: 遷移 ${migrated} / 跳過 ${skipped} / 失敗 ${failed} / 共 ${records.length}`);
  return { total: records.length, migrated, skipped, failed };
}

async function main() {
  console.log('🔧 app_domain 資料回補');
  console.log(`   Target Domain: "${APP_DOMAIN}"`);
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   App Slug: ${APP_SLUG}`);

  // 登入取得 Token
  console.log('\n🔑 取得 Bearer Token...');
  const token = await getToken();
  console.log('  ✅ 登入成功');

  const tables = ['product_templates', 'sale_orders', 'sale_order_lines'];
  const results = {};

  for (const table of tables) {
    results[table] = await migrateTable(token, table);
  }

  // 總結報告
  console.log('\n════════════════════════════════════');
  console.log('📊 遷移總結');
  console.log('════════════════════════════════════');
  for (const [table, r] of Object.entries(results)) {
    const status = r.failed > 0 ? '⚠️' : '✅';
    console.log(`  ${status} ${table}: ${r.migrated} 遷移 / ${r.skipped} 已存在 / ${r.failed} 失敗 (共 ${r.total})`);
  }

  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  if (totalFailed > 0) {
    console.log(`\n⚠️ 有 ${totalFailed} 筆記錄遷移失敗，請手動檢查`);
    process.exit(1);
  } else {
    console.log('\n✅ 所有記錄已成功注入 app_domain！');
  }
}

main().catch(err => {
  console.error('❌ 遷移失敗:', err.message);
  process.exit(1);
});
