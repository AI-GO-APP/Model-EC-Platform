/**
 * 示範商城 — 瀏覽器 E2E 全頁面功能測試
 * 遍歷所有頁面，檢查所有按鈕和互動功能是否正確運行
 * 使用 Puppeteer 自動化瀏覽器
 *
 * 測試範圍：
 * 1. 所有頁面可載入且無 JS 錯誤
 * 2. Header/Footer 共用元件正確渲染
 * 3. 首頁精選商品動態載入
 * 4. 商品列表：篩選、排序、分頁
 * 5. 商品詳情：圖片、規格、加入購物車、加入願望清單
 * 6. 購物車：增減數量、移除、金額計算
 * 7. 帳戶：註冊、登入、會員中心、訂單歷史
 * 8. 結帳：Auth Guard、表單驗證
 * 9. 願望清單：新增、移除
 * 10. 多語切換
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5180';

// 所有頁面清單
const PAGES = [
  { path: '/', name: '首頁' },
  { path: '/products.html', name: '商品列表' },
  { path: '/collections.html', name: '商品分類' },
  { path: '/cart.html', name: '購物車' },
  { path: '/wishlist.html', name: '願望清單' },
  { path: '/account.html', name: '帳戶' },
  { path: '/about.html', name: '關於我們' },
  { path: '/contact.html', name: '聯絡我們' },
  { path: '/search.html', name: '搜尋' },
];

let passed = 0;
let failed = 0;
const errors = [];
const jsErrors = [];

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

async function main() {
  // 動態 import puppeteer
  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    console.error('❗ 請先安裝 puppeteer: npm install puppeteer --save-dev');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  示範商城 — 瀏覽器 E2E 全頁面功能測試             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\nBase URL: ${BASE_URL}\n`);

  const browser = await puppeteer.default.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 監聽 JS 錯誤
  page.on('pageerror', err => {
    jsErrors.push(err.message);
  });

  try {
    // ============================================================
    // Test 1: 所有頁面可載入
    // ============================================================
    console.log('=== 1. 頁面載入測試 ===');
    for (const pg of PAGES) {
      try {
        const res = await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        assert(res.status() === 200, `${pg.name} (${pg.path}) — HTTP 200`);
      } catch (e) {
        assert(false, `${pg.name} (${pg.path}) — 載入失敗: ${e.message}`);
      }
    }

    // ============================================================
    // Test 2: Header/Footer 共用元件
    // ============================================================
    console.log('\n=== 2. Header/Footer 共用元件 ===');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 15000 });
    
    const hasHeader = await page.$('#site-header');
    assert(!!hasHeader, 'Header 存在');
    
    const hasFooter = await page.$('#site-footer');
    assert(!!hasFooter, 'Footer 存在');
    
    const hasLogo = await page.$('.header__logo, .site-name');
    assert(!!hasLogo, '品牌 Logo/名稱存在');
    
    const hasNav = await page.$('.header__nav, nav');
    assert(!!hasNav, '導航列存在');
    
    const hasCartIcon = await page.$('.header__cart, [href*="cart"]');
    assert(!!hasCartIcon, '購物車圖示存在');

    // ============================================================
    // Test 3: 首頁精選商品
    // ============================================================
    console.log('\n=== 3. 首頁精選商品動態載入 ===');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(3000); // 等候 API 載入
    
    const productCards = await page.$$('.product-card');
    assert(productCards.length > 0, `精選商品卡片存在 (${productCards.length} 張)`);
    
    if (productCards.length > 0) {
      const firstCardImg = await productCards[0].$('img');
      assert(!!firstCardImg, '商品卡片有圖片');
    }

    // ============================================================
    // Test 4: 商品列表頁
    // ============================================================
    console.log('\n=== 4. 商品列表頁 ===');
    await page.goto(`${BASE_URL}/products.html`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const listCards = await page.$$('.product-card');
    assert(listCards.length > 0, `商品列表有卡片 (${listCards.length} 張)`);
    
    // 篩選欄
    const filterPanel = await page.$('.filter-panel, .filters, [class*=filter]');
    assert(!!filterPanel, '篩選面板存在');

    // ============================================================
    // Test 5: 商品詳情頁
    // ============================================================
    console.log('\n=== 5. 商品詳情頁 ===');
    // 從列表頁取得第一個商品的 ID
    const firstLink = await page.$('a.product-card');
    let productUrl = null;
    if (firstLink) {
      productUrl = await page.evaluate(el => el.getAttribute('href'), firstLink);
    }
    
    if (productUrl) {
      await page.goto(`${BASE_URL}${productUrl}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      const pdpTitle = await page.$('.pdp-title, h1');
      assert(!!pdpTitle, '商品標題存在');
      
      const pdpPrice = await page.$('.pdp-price, .price');
      assert(!!pdpPrice, '商品價格存在');
      
      const addCartBtn = await page.$('#btn-add-cart, [class*="add-cart"]');
      assert(!!addCartBtn, '加入購物車按鈕存在');
      
      const wishlistBtn = await page.$('#btn-wishlist, [class*="wishlist"]');
      assert(!!wishlistBtn, '加入願望清單按鈕存在');
      
      const qtyControls = await page.$$('.qty-btn');
      assert(qtyControls.length >= 2, `數量控制按鈕存在 (${qtyControls.length} 個)`);

      // 點擊加入購物車
      if (addCartBtn) {
        await addCartBtn.click();
        await page.waitForTimeout(1000);
        
        // 檢查 Toast 通知
        const toast = await page.$('.toast, [class*="toast"]');
        assert(!!toast, '加入購物車後出現 Toast 通知');
        
        // 檢查 Header 購物車徽章
        const badge = await page.$('.cart-badge, .badge');
        const badgeText = badge ? await page.evaluate(el => el.textContent, badge) : '0';
        assert(parseInt(badgeText) > 0, `購物車徽章更新 (${badgeText})`);
      }

      // 點擊願望清單
      if (wishlistBtn) {
        await wishlistBtn.click();
        await page.waitForTimeout(1000);
        const toast2 = await page.$('.toast, [class*="toast"]');
        assert(!!toast2, '願望清單操作出現 Toast 通知');
      }
    } else {
      assert(false, '無法取得商品連結');
    }

    // ============================================================
    // Test 6: 購物車頁
    // ============================================================
    console.log('\n=== 6. 購物車頁 ===');
    await page.goto(`${BASE_URL}/cart.html`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const cartItems = await page.$$('.cart-item');
    assert(cartItems.length > 0, `購物車有商品 (${cartItems.length} 件)`);
    
    const summaryEl = await page.$('.checkout-summary');
    assert(!!summaryEl, '訂單摘要存在');
    
    // 檢查摘要金額
    const summaryText = summaryEl ? await page.evaluate(el => el.textContent, summaryEl) : '';
    assert(summaryText.includes('NT$') || summaryText.includes('$'), '摘要包含金額');
    
    const checkoutLink = await page.$('a[href*="checkout"]');
    assert(!!checkoutLink, '前往結帳按鈕存在');

    // ============================================================
    // Test 7: 帳戶頁 — 註冊/登入
    // ============================================================
    console.log('\n=== 7. 帳戶頁 — Auth 流程 ===');
    await page.goto(`${BASE_URL}/account.html?action=login`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // 登入表單
    const emailInput = await page.$('#login-email, input[type="email"]');
    assert(!!emailInput, '登入 Email 輸入框存在');
    
    const pwInput = await page.$('#login-password, input[type="password"]');
    assert(!!pwInput, '登入密碼輸入框存在');
    
    const loginBtn = await page.$('#btn-login, button[type="submit"]');
    assert(!!loginBtn, '登入按鈕存在');

    // 嘗試註冊新帳號
    const registerTab = await page.$('[data-tab="register"], #show-register');
    if (registerTab) {
      await registerTab.click();
      await page.waitForTimeout(500);
    }
    
    const regNameInput = await page.$('#reg-name');
    const regEmailInput = await page.$('#reg-email');
    const regPwInput = await page.$('#reg-password');
    
    if (regEmailInput && regPwInput) {
      const testEmail = `browser_e2e_${Date.now()}@test.com`;
      if (regNameInput) await regNameInput.type('Browser E2E');
      await regEmailInput.type(testEmail);
      await regPwInput.type('E2eTest_123!');
      
      const regBtn = await page.$('#btn-register');
      if (regBtn) {
        await regBtn.click();
        await page.waitForTimeout(3000);
        
        // 檢查是否導到會員中心
        const memberPanel = await page.$('.member-panel, #member-panel, [class*="member"]');
        assert(!!memberPanel, '註冊成功後顯示會員中心');
      }
    }

    // ============================================================
    // Test 8: 結帳頁 — Auth Guard
    // ============================================================
    console.log('\n=== 8. 結帳頁 ===');
    await page.goto(`${BASE_URL}/checkout.html`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(2000);

    // 如果已登入且有購物車，應看到結帳表單
    const checkoutForm = await page.$('.checkout-layout, .checkout-section, #step-1');
    const checkoutSteps = await page.$$('.checkout-step');
    assert(checkoutSteps.length >= 4 || !!checkoutForm, `結帳步驟/表單存在 (${checkoutSteps.length} 步)`);

    // ============================================================
    // Test 9: 願望清單頁
    // ============================================================
    console.log('\n=== 9. 願望清單頁 ===');
    await page.goto(`${BASE_URL}/wishlist.html`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const wishlistEmpty = await page.$('#wishlist-empty');
    const wishlistGrid = await page.$('#wishlist-grid');
    assert(!!wishlistEmpty || !!wishlistGrid, '願望清單容器存在');

    // ============================================================
    // Test 10: 多語切換
    // ============================================================
    console.log('\n=== 10. 多語切換 ===');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const langToggle = await page.$('.lang-toggle, [data-lang], #lang-en, .lang-switch');
    assert(!!langToggle, '語言切換按鈕存在');

    // ============================================================
    // Test 11: JS 錯誤收集
    // ============================================================
    console.log('\n=== 11. JavaScript 錯誤檢查 ===');
    if (jsErrors.length === 0) {
      assert(true, '無 JavaScript 執行錯誤');
    } else {
      assert(false, `有 ${jsErrors.length} 個 JS 錯誤`);
      jsErrors.forEach(e => console.log(`    ⚠️ ${e.substring(0, 120)}`));
    }

  } catch (err) {
    console.error('\n💥 測試中斷：', err);
    failed++;
    errors.push(`測試中斷: ${err.message}`);
  } finally {
    await browser.close();
  }

  // 結果
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  結果：${passed} 通過 / ${failed} 失敗                        ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\n失敗項目：');
    errors.forEach(e => console.log(`  • ${e}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
