/**
 * 示範商城 — 產生公開商品快取
 * 使用 API Key (Open Proxy) 拉取 product_templates，
 * 輸出為 public/data/cache/product_templates.json
 * 
 * 用途：讓未登入用戶也能瀏覽商品
 * 執行：npm run cache:products
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';

const API_BASE = process.env.VITE_API_BASE;
const API_KEY = process.env.AIGO_API_KEY;

if (!API_BASE || !API_KEY) {
  console.error('❌ 需要 VITE_API_BASE 和 AIGO_API_KEY 環境變數');
  process.exit(1);
}

async function main() {
  console.log('📦 開始產生商品快取...');

  // 透過 Open Proxy 拉取全部商品
  const res = await fetch(`${API_BASE}/open/proxy/product_templates?limit=200`, {
    headers: { 'X-API-Key': API_KEY },
  });

  if (!res.ok) {
    console.error(`❌ API 回傳 ${res.status}:`, await res.text());
    process.exit(1);
  }

  const products = await res.json();
  console.log(`  ✅ 取得 ${products.length} 筆商品`);

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
