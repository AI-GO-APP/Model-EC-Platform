/**
 * 示範商城商品匯入腳本
 * 將精品電商風格示範商品匯入 AI GO product_templates
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

/** App Domain 標識（與 src/js/utils/config.js 保持一致） */
const APP_DOMAIN = 'ec-platform';

const PRODUCTS = [
  {
    name: '經典摺疊手提包',
    type: 'consu',
    list_price: 12800,
    sale_ok: true,
    active: true,
    description: '採用頂級義大利植鞣皮革，手工打磨，經久耐用。極簡設計搭配可拆卸肩帶，滿足日常通勤與週末出遊的多種需求。',
    description_sale: '義大利植鞣皮革 / 手工打磨 / 可拆卸肩帶 / 內置拉鏈口袋',
    default_code: 'BAG-CLASSIC-001',
    image_url: `${IMG_BASE}/leather-bag.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Classic Leather Tote',
      description_en: 'Crafted from premium Italian vegetable-tanned leather with hand-polished finish.',
      category_display: '包款',
      category_en: 'Bags',
      tags: ['新品', '熱銷'],
      colors: [
        { name: '經典黑', hex: '#2D3436', available: true },
        { name: '焦糖棕', hex: '#8B6914', available: true },
        { name: '墨綠', hex: '#2D5016', available: false }
      ],
      sizes: ['S', 'M', 'L'],
      rating: 4.8,
      review_count: 128,
      weight: '0.6kg',
      material: '義大利植鞣皮革',
    }
  },
  {
    name: '職人手作陶瓷杯',
    type: 'consu',
    list_price: 1280,
    sale_ok: true,
    active: true,
    description: '由台灣在地陶藝師手工拉坯燒製，每件色澤紋理略有不同，獨一無二。適合咖啡、茶飲、早餐穀物等多種用途。',
    description_sale: '台灣手作 / 窯燒陶瓷 / 容量 350ml / 可微波',
    default_code: 'MUG-CRAFT-001',
    image_url: `${IMG_BASE}/ceramic-mug.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Artisan Ceramic Mug',
      description_en: 'Handcrafted by Taiwanese artisan, each piece is unique in texture and glaze.',
      category_display: '居家',
      category_en: 'Home',
      tags: ['手作', '限量'],
      colors: [
        { name: '霧灰', hex: '#B2BEC3', available: true },
        { name: '奶白', hex: '#F5F0E8', available: true },
        { name: '靛藍', hex: '#2C3E6B', available: true }
      ],
      rating: 4.9,
      review_count: 86,
      capacity: '350ml',
      material: '高溫窯燒陶瓷',
    }
  },
  {
    name: '喀什米爾羊毛圍巾',
    type: 'consu',
    list_price: 4680,
    sale_ok: true,
    active: true,
    description: '100% 喀什米爾山羊絨，輕如鴻毛卻溫暖厚實。優雅的駝色調搭配捲邊設計，是秋冬穿搭的百搭單品。',
    description_sale: '100% 喀什米爾 / 手感柔軟 / 200x70cm / 附品牌禮盒',
    default_code: 'SCF-CASH-001',
    image_url: `${IMG_BASE}/wool-scarf.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Cashmere Wool Scarf',
      description_en: '100% cashmere goat wool, feather-light yet incredibly warm.',
      category_display: '配飾',
      category_en: 'Accessories',
      tags: ['精選', '送禮推薦'],
      colors: [
        { name: '駝色', hex: '#C4A882', available: true },
        { name: '煙灰', hex: '#636E72', available: true },
        { name: '酒紅', hex: '#6D1F3A', available: true }
      ],
      rating: 4.7,
      review_count: 52,
      dimensions: '200 x 70 cm',
      material: '100% 喀什米爾山羊絨',
    }
  },
  {
    name: '極簡自動機械錶',
    type: 'consu',
    list_price: 18500,
    sale_ok: true,
    active: true,
    description: '日本 Miyota 自動機械機芯，藍寶石鏡面，316L 不鏽鋼錶殼搭配義大利小牛皮錶帶。防水 50 米，適合日常佩戴。',
    description_sale: 'Miyota 機芯 / 藍寶石鏡面 / 50M 防水 / 皮革錶帶',
    default_code: 'WCH-AUTO-001',
    image_url: `${IMG_BASE}/watch.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Minimalist Automatic Watch',
      description_en: 'Japanese Miyota movement, sapphire crystal, Italian leather strap.',
      category_display: '手錶',
      category_en: 'Watches',
      tags: ['新品', '限量'],
      colors: [
        { name: '深藍面', hex: '#1B2631', available: true },
        { name: '銀白面', hex: '#ECF0F1', available: true }
      ],
      rating: 4.6,
      review_count: 34,
      case_size: '40mm',
      movement: 'Miyota 9015 自動機械',
      water_resistance: '50M',
    }
  },
  {
    name: '天然大豆香氛蠟燭',
    type: 'consu',
    list_price: 980,
    sale_ok: true,
    active: true,
    description: '100% 天然大豆蠟，添加法國 Grasse 頂級精油。木蓋密封設計，燃燒時間長達 45 小時，低煙無毒，營造溫馨居家氛圍。',
    description_sale: '天然大豆蠟 / Grasse 精油 / 45hrs 燃燒 / 木蓋密封',
    default_code: 'CDL-SOY-001',
    image_url: `${IMG_BASE}/candle.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Soy Wax Scented Candle',
      description_en: 'Made with 100% natural soy wax and premium Grasse essential oils.',
      category_display: '居家',
      category_en: 'Home',
      tags: ['熱銷', '送禮推薦'],
      scents: [
        { name: '白茶與鼠尾草', available: true },
        { name: '雪松與琥珀', available: true },
        { name: '薰衣草與佛手柑', available: true }
      ],
      rating: 4.9,
      review_count: 215,
      burn_time: '45 小時',
      weight: '220g',
    }
  },
  {
    name: '極簡皮革運動鞋',
    type: 'consu',
    list_price: 5980,
    sale_ok: true,
    active: true,
    description: '全粒面小牛皮鞋面，記憶棉鞋墊，輕量化 EVA 大底。極簡設計從街頭到辦公室都能駕馭。',
    description_sale: '全粒面小牛皮 / 記憶棉鞋墊 / EVA 輕量大底',
    default_code: 'SNK-LEATH-001',
    image_url: `${IMG_BASE}/sneakers.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Minimal Leather Sneakers',
      description_en: 'Full-grain calfskin upper with memory foam insole and lightweight EVA outsole.',
      category_display: '鞋履',
      category_en: 'Shoes',
      tags: ['新品'],
      colors: [
        { name: '純白', hex: '#FFFFFF', available: true },
        { name: '米白', hex: '#F5F0E8', available: true },
        { name: '黑色', hex: '#2D3436', available: true }
      ],
      sizes: ['38', '39', '40', '41', '42', '43', '44'],
      rating: 4.5,
      review_count: 67,
      material: '全粒面小牛皮',
    }
  },
  {
    name: '手縫皮革筆記本',
    type: 'consu',
    list_price: 1680,
    sale_ok: true,
    active: true,
    description: '採用植鞣牛皮手工縫製，隨時間使用會產生獨特的皮革光澤。搭配 100gsm 無酸紙張，適合書寫、繪畫與筆記。',
    description_sale: '植鞣牛皮 / 手工縫製 / 100gsm 無酸紙 / A5 尺寸',
    default_code: 'NTB-LEATH-001',
    image_url: `${IMG_BASE}/notebook.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Hand-Stitched Leather Journal',
      description_en: 'Vegetable-tanned cowhide, hand-stitched binding, develops patina over time.',
      category_display: '文具',
      category_en: 'Stationery',
      tags: ['手作'],
      colors: [
        { name: '深棕', hex: '#5D4037', available: true },
        { name: '淺棕', hex: '#A67B5B', available: true }
      ],
      rating: 4.8,
      review_count: 93,
      pages: 192,
      size: 'A5 (148 x 210mm)',
    }
  },
  {
    name: '琥珀紋醋酸纖維太陽眼鏡',
    type: 'consu',
    list_price: 3680,
    sale_ok: true,
    active: true,
    description: '義大利 Mazzucchelli 醋酸纖維鏡框，偏光鏡片提供 UV400 防護。經典圓角矩形設計，適合多種臉型。',
    description_sale: '義大利醋酸纖維 / 偏光鏡片 / UV400 / 附眼鏡盒',
    default_code: 'SUN-ACE-001',
    image_url: `${IMG_BASE}/sunglasses.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Acetate Sunglasses',
      description_en: 'Italian Mazzucchelli acetate frame with polarized UV400 lenses.',
      category_display: '配飾',
      category_en: 'Accessories',
      tags: ['精選'],
      colors: [
        { name: '琥珀紋', hex: '#8D6E37', available: true },
        { name: '亮黑', hex: '#1C1C1C', available: true },
        { name: '透明灰', hex: '#A8A8A8', available: true }
      ],
      rating: 4.7,
      review_count: 41,
      lens: '偏光 CR-39',
      uv_protection: 'UV400',
    }
  },
  {
    name: '侘寂白瓷茶具組',
    type: 'consu',
    list_price: 2980,
    sale_ok: true,
    active: true,
    description: '靈感源自日本侘寂美學，啞光白釉瓷器，含一壺兩杯。高溫 1280°C 電窯燒製，釉面溫潤如玉。',
    description_sale: '啞光白釉 / 一壺兩杯 / 1280°C 窯燒 / 附木質托盤',
    default_code: 'TEA-WABI-001',
    image_url: `${IMG_BASE}/tea-set.png`,
    custom_data: {
      app_domain: APP_DOMAIN,
      name_en: 'Wabi-Sabi Ceramic Tea Set',
      description_en: 'Inspired by Japanese wabi-sabi aesthetics, matte white glaze, includes teapot and two cups.',
      category_display: '居家',
      category_en: 'Home',
      tags: ['精選', '送禮推薦'],
      rating: 4.9,
      review_count: 38,
      pieces: '1 壺 + 2 杯',
      teapot_capacity: '400ml',
      cup_capacity: '120ml',
      material: '高溫白瓷',
    }
  },
];

async function main() {
  console.log('=== 示範商城商品匯入 ===\n');

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

  // 驗證總數
  console.log('\n--- 驗證 ---');
  const countRes = await fetch(`${API_BASE}/open/proxy/product_templates?limit=100`, {
    headers: { 'X-API-Key': API_KEY },
  });
  const all = await countRes.json();
  console.log(`目前 product_templates 共 ${all.length} 筆商品`);

  console.log('\n=== 完成 ===');
}

main().catch(console.error);
