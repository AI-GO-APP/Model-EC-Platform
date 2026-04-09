/**
 * 源興國際企業 — 展示用商品匯入腳本
 * 將日製陶瓷、生活用品、飾品等示範商品匯入 AI GO product_templates
 */
import 'dotenv/config';

const API_BASE = process.env.VITE_API_BASE || 'https://ai-go.app/api/v1';
const API_KEY = process.env.AIGO_API_KEY;

if (!API_KEY) {
  console.error('❗ 請在 .env 中設定 AIGO_API_KEY');
  process.exit(1);
}

// 圖片 base URL（部署後需替換為正式 URL）
const IMG_BASE = '/images/products';

/** App Domain 標識（源興國際專屬） */
const APP_DOMAIN = process.env.VITE_APP_DOMAIN || 'ec-platform';

const PRODUCTS = [
  {
    name: '日本有田燒-櫻花紋陶瓷深盤',
    type: 'consu',
    list_price: 1280,
    sale_ok: true,
    active: true,
    description: '源自日本百年工藝的有田燒，職人手工繪製精緻櫻花圖騰。適用於各式和風料理，為餐桌增添優雅氣息。',
    description_sale: '日本手工繪製 / 櫻花圖騰 / 適用微波爐 / 直徑21cm',
    default_code: 'ART-PLT-001',
    image_url: `${IMG_BASE}/arita-plate.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Arita-yaki Sakura Deep Plate',
      description_en: 'Traditional Japanese Arita porcelain with hand-painted cherry blossom patterns.',
      category_display: '日製陶瓷',
      category_en: 'Japanese Ceramics',
      tags: ['新品', '日本製', '熱銷'],
      colors: [
        { name: '白底粉櫻', hex: '#FFF5F8', available: true }
      ],
      rating: 4.9,
      review_count: 56,
      dimensions: '直徑 21cm x 高 4.5cm',
      material: '高溫窯燒陶瓷',
      origin: '日本 佐賀縣有田町',
    }
  },
  {
    name: '富士山手工琉璃清酒杯',
    type: 'consu',
    list_price: 1580,
    sale_ok: true,
    active: true,
    description: '杯底精巧呈現富士山輪廓，隨杯中飲品光線折射出不同層次之美。日系職人手工吹製，無鉛玻璃材質，兼具實用與收藏價值。',
    description_sale: '富士山造型 / 手工吹製琉璃 / 禮盒包裝 / 送禮首選',
    default_code: 'GLS-FUJI-001',
    image_url: `${IMG_BASE}/fuji-glass.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Mount Fuji Handmade Glass Cup',
      description_en: 'Hand-blown glass cup featuring a Mount Fuji silhouette at the base. Beautiful light refraction.',
      category_display: '日製陶瓷',
      category_en: 'Japanese Ceramics',
      tags: ['精選', '送禮推薦', '日本製'],
      colors: [
        { name: '透明清輝', hex: '#E0F7FA', available: true }
      ],
      rating: 4.8,
      review_count: 124,
      capacity: '280ml',
      material: '無鉛水晶玻璃',
      origin: '日本 東京都',
    }
  },
  {
    name: '無印風原木圓潤收納盒',
    type: 'consu',
    list_price: 890,
    sale_ok: true,
    active: true,
    description: '採用天然櫸木製作，打磨圓潤無邊角。極簡無印風格，完美融入日系居家空間，適合收納首飾、文具與生活小物。',
    description_sale: '天然櫸木 / 無印極簡風 / 多功能收納 / 環保塗層',
    default_code: 'WDN-BOX-001',
    image_url: `${IMG_BASE}/wooden-box.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Minimalist Wooden Storage Box',
      description_en: 'Natural beech wood, Muji-style minimalist design for everyday storage.',
      category_display: '生活用品',
      category_en: 'Daily Necessities',
      tags: ['居家收納', '環保材質'],
      colors: [
        { name: '原木色', hex: '#D7CCC8', available: true }
      ],
      rating: 4.7,
      review_count: 82,
      dimensions: '長 20cm x 寬 12cm x 高 6cm',
      material: '天然櫸木',
      origin: '台灣設計 / 合作廠製造',
    }
  },
  {
    name: '925純銀鑲單顆天然珍珠項鍊',
    type: 'consu',
    list_price: 2480,
    sale_ok: true,
    active: true,
    description: '嚴選 8mm 高光澤天然淡水珍珠，搭配防敏抗氧化的 S925 純銀項鍊。流行百搭，點綴日常與重要場合的優雅氣質。',
    description_sale: '天然淡水珍珠 / S925純銀防敏 / 長度可調 / 附珠寶盒',
    default_code: 'ACC-PRL-001',
    image_url: `${IMG_BASE}/pearl-necklace.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: '925 Silver Pearl Necklace',
      description_en: '8mm freshwater pearl on an adjustable hypoallergenic 925 sterling silver chain.',
      category_display: '流行飾品',
      category_en: 'Accessories',
      tags: ['氣質百搭', '熱銷'],
      colors: [
        { name: '銀白珍珠', hex: '#F0F4F8', available: true }
      ],
      rating: 4.9,
      review_count: 215,
      pearl_size: '8mm',
      material: 'S925純銀 / 天然淡水珍珠',
      chain_length: '40cm + 5cm延長鍊',
    }
  }
];

// 可以視需求生成幾筆示範訂單的資料，此為選填或後續再補齊
const MOCK_ORDERS = [
  // 這裡可以預留未來注入訂單的格式
];

async function main() {
  console.log(`=== 源興國際展示商品匯入 (Target Domain: ${APP_DOMAIN}) ===\n`);

  for (const product of PRODUCTS) {
    try {
      const res = await fetch(`${API_BASE}/open/proxy/product_templates`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`✅ ${product.name} (${product.default_code}) — ID: ${data.id}`);
      } else {
        const err = await res.text();
        console.log(`❌ ${product.name} — ${res.status}: ${err.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`❌ ${product.name} — 網路錯誤: ${e.message}`);
    }
  }

  // 驗證總數（僅過濾出源興的商品）
  console.log('\n--- 驗證 ---');
  let url = `${API_BASE}/open/proxy/product_templates?limit=100`;
  // 注意: AI GO open API 若支援 filter 則可加，這裡先抓全部回來數即可
  const countRes = await fetch(url, {
    headers: { 'X-API-Key': API_KEY },
  });
  
  if (countRes.ok) {
      const all = await countRes.json();
      const yuanHsingProducts = all.filter(p => p.custom_data && p.custom_data.app_domain === APP_DOMAIN);
      console.log(`目前 AI GO product_templates 中共 ${all.length} 筆商品`);
      console.log(`其中屬於源興國際 (${APP_DOMAIN}) 的商品共有 ${yuanHsingProducts.length} 筆`);
  } else {
      console.log('無法驗證商品總數。');
  }

  console.log('\n=== 完成 ===');
}

main().catch(console.error);
