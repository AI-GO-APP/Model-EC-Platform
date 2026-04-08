/**
 * 示範商城 — 產生公開商品快取
 * 使用 API Key (Open Proxy) 拉取 product_templates，
 * 輸出為 public/data/cache/product_templates.json
 * 
 * 用途：讓未登入用戶也能瀏覽商品
 * 執行：npm run cache:products
 * 
 * 注意：僅快取 app_domain === 'ec-platform' 的商品（§13 隔離策略）
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';

const API_BASE = process.env.VITE_API_BASE;
const API_KEY = process.env.AIGO_API_KEY;

/** App Domain 標識（與 src/js/utils/config.js 保持一致） */
const APP_DOMAIN = 'ec-platform';

if (!API_BASE || !API_KEY) {
  console.error('❌ 需要 VITE_API_BASE 和 AIGO_API_KEY 環境變數');
  process.exit(1);
}

async function main() {
  console.log('📦 開始產生商品快取...');
  console.log(`  🏷️  App Domain: ${APP_DOMAIN}`);

  // 透過 Open Proxy + POST query 端點拉取屬於 ec-platform 的商品
  const res = await fetch(`${API_BASE}/open/proxy/product_templates/query`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters: [
        { column: 'custom_data', op: 'ilike', value: `%app_domain%${APP_DOMAIN}%` }
      ],
      limit: 200,
    }),
  });

  if (!res.ok) {
    console.error(`❌ API 回傳 ${res.status}:`, await res.text());
    process.exit(1);
  }

  const products = await res.json();
  console.log(`  ✅ 取得 ${products.length} 筆商品（已過濾 app_domain）`);

  // 過濾出 active 且有效的商品
  const validProducts = products.filter(p => p.active !== false);
  console.log(`  ✅ 有效商品 ${validProducts.length} 筆`);

  // 確保目錄存在
  mkdirSync('public/data/cache', { recursive: true });

  // 寫入 JSON 快取
  const outputPath = 'public/data/cache/product_templates.json';
  writeFileSync(outputPath, JSON.stringify(validProducts, null, 2), 'utf-8');
  console.log(`  ✅ 已寫入 ${outputPath}`);
  console.log(`\n✅ 快取產生完成！未登入用戶現在可以瀏覽商品了。`);
}

main().catch(err => {
  console.error('❌ 快取產生失敗:', err.message);
  process.exit(1);
});

