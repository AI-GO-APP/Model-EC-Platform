# EC Platform — 租戶抽換與串接指引

> **目的**：讓 AI Agent 或人類根據 6 項輸入資訊，將 staging VM 上已部署的 EC Platform 直接串接到另一個租戶的應用。

---

## 1. 前置條件

- 目標租戶的 Custom App / Self-Built App 已由管理員在 AI GO 管理後台開好
- 系統表引用（references）已由 Builder 事先建立，且**已發佈（Publish）**
- 已 clone 本 Repo 至本機（`git clone https://github.com/AI-GO-APP/Model-EC-Platform.git`）
- 本機已安裝 Node.js（≥18）與 npm

> ⚠️ **引用必須發佈**：Builder 在 AI GO 管理後台建立系統表引用後，必須點擊「發佈」使其生效。未發佈的引用會導致 Open Proxy / Ext Proxy 回傳 `403 Forbidden`。

### Git 版控說明

| 檔案 | Git 狀態 | 說明 |
|------|---------|------|
| `.env.production` | ✅ **tracked** | 包含 `VITE_*` 公開變數，修改後需 commit + push |
| `.env` | ❌ **gitignored** | 包含 API Key / Admin 密碼等敏感資訊，僅存於本機 |
| `public/data/cache/*.json` | ✅ **tracked** | 商品快取，產生後需 commit + push |
| `scripts/seed-*.mjs` | ✅ **tracked** | 資料注入腳本 |

---

## 2. 輸入資訊定義

操作者需提供以下 **6 項資訊**：

| # | 輸入名稱 | 範例值 | 說明 |
|---|----------|--------|------|
| ① | **Admin 帳號** | `admin@company-x.com` | Builder 管理員 Email |
| ② | **Admin 密碼** | `Admin1234!` | Builder 管理員密碼 |
| ③ | **Slug** | `a1b2c3d4e5f6` | Custom App 的 12 字元十六進位識別碼 |
| ④ | **API Key** | `sk_live_xxxx...` | Open Proxy 使用的伺服器端 API Key |
| ⑤ | **Login URL** | `https://ai-go.app/api/v1/custom-app-auth/a1b2c3d4e5f6/login` | 消費者登入端點完整 URL |
| ⑥ | **Register URL** | `https://ai-go.app/api/v1/custom-app-auth/a1b2c3d4e5f6/register` | 消費者註冊端點完整 URL |

---

## 3. 從輸入推導環境變數

EC Platform 所有 API 呼叫都建構自兩個核心變數：`VITE_API_BASE` 與 `VITE_APP_SLUG`。
這兩者可從 Login URL 解析而得：

```
Login URL 格式：
{API_BASE}/custom-app-auth/{SLUG}/login
└─────────────┘              └────┘
  VITE_API_BASE           VITE_APP_SLUG
```

### 解析規則

```javascript
// 從 Login URL 解析：
const loginUrl = '⑤ Login URL';
const match = loginUrl.match(/^(.+)\/custom-app-auth\/([a-f0-9]+)\/login$/);

const VITE_API_BASE = match[1];    // e.g. 'https://ai-go.app/api/v1'
const VITE_APP_SLUG = match[2];    // e.g. 'a1b2c3d4e5f6'（應等於 ③ Slug）
```

> ⚠️ **驗證**：解析出的 `VITE_APP_SLUG` 必須等於輸入 ③ Slug。若不一致，代表 Login URL 與 Slug 不匹配，請向租戶確認。

### 完整環境變數對照表

| 環境變數 | 來源 | 用途 | 暴露範圍 |
|---------|------|------|---------|
| `VITE_API_BASE` | 從 ⑤ Login URL 解析 | 前端所有 API 呼叫基底 | 前端（打包進 JS） |
| `VITE_APP_SLUG` | ③ Slug | 前端 Custom App Auth 路由識別 | 前端（打包進 JS） |
| `AIGO_API_KEY` | ④ API Key | Open Proxy 存取 | 僅伺服器端腳本 |
| `AIGO_BUILDER_EMAIL` | ① Admin 帳號 | 管理操作 | 僅伺服器端腳本 |
| `AIGO_BUILDER_PASSWORD` | ② Admin 密碼 | 管理操作 | 僅伺服器端腳本 |

---

## 4. 執行步驟

### 流程總覽

```
本機操作                                         自動化
───────────────────────────────────────   ──────────────────
Step 1: 產生 .env + .env.production       
Step 2: 驗證端點連通性
Step 3: 匯入展示商品（npm run seed）
Step 4: 產生商品快取（npm run cache:products）
Step 5: commit + push to main            → GitHub Actions
                                            自動 build Docker
                                            自動部署到 staging VM
Step 6: E2E 驗證（npm test）
```

> 💡 所有 Step 1-4 在**本機**執行（需要 `.env` 中的 API Key）。Step 5 push 後由 CI/CD 自動處理部署。

### 一鍵自動化（Step 1-4）

若偏好一鍵完成 Step 1-4，可使用 [switch-tenant.sh](../scripts/switch-tenant.sh)：

```bash
bash scripts/switch-tenant.sh \
  --admin-email "admin@company-x.com" \
  --admin-password "Admin1234!" \
  --slug "a1b2c3d4e5f6" \
  --api-key "sk_live_xxxx..." \
  --login-url "https://ai-go.app/api/v1/custom-app-auth/a1b2c3d4e5f6/login" \
  --register-url "https://ai-go.app/api/v1/custom-app-auth/a1b2c3d4e5f6/register" \
  --skip-docker
```

> ⚠️ 使用 `--skip-docker` 跳過本機 Docker 操作，完成後手動執行 Step 5（commit + push）觸發 CI/CD 部署。

以下為各步驟詳解，方便手動操作或除錯。

---

### Step 1：產生 `.env` 檔案

用以下模板覆寫 `.env`（將佔位符替換為實際值）：

```bash
cat > .env << 'EOF'
# EC Platform — 環境變數
VITE_API_BASE=<從 Login URL 解析的 API_BASE>
VITE_APP_SLUG=<③ Slug>

# 伺服器端腳本專用（不暴露於前端）
AIGO_API_KEY=<④ API Key>
AIGO_BUILDER_EMAIL=<① Admin 帳號>
AIGO_BUILDER_PASSWORD=<② Admin 密碼>
EOF
```

同步更新 `.env.production`（Vite 建置用，僅包含 `VITE_` 前綴的公開變數）：

```bash
cat > .env.production << 'EOF'
VITE_API_BASE=<從 Login URL 解析的 API_BASE>
VITE_APP_SLUG=<③ Slug>
EOF
```

> ⚠️ `.env.production` 是 **git tracked** 的檔案，`VITE_*` 變數會在 CI/CD build 時靜態替換進 JS bundle。修改後須 commit + push 觸發重新部署（見 Step 5）。
>
> `.env`（含 API Key 等敏感資訊）是 **gitignored** 的，僅存於本機，不會進入版控。

---

### Step 2：驗證端點連通性

```bash
# 驗證 Login URL（預期 400 或 422，代表端點存在）
curl -s -o /dev/null -w "%{http_code}" -X POST "<⑤ Login URL>" \
  -H "Content-Type: application/json" -d '{}'

# 驗證 Register URL
curl -s -o /dev/null -w "%{http_code}" -X POST "<⑥ Register URL>" \
  -H "Content-Type: application/json" -d '{}'

# 驗證 API Key（Open Proxy）
curl -s -o /dev/null -w "%{http_code}" \
  "<VITE_API_BASE>/open/proxy/product_templates?limit=1" \
  -H "X-API-Key: <④ API Key>"
```

| 預期結果 | 說明 |
|---------|------|
| Login/Register 回傳 `400` 或 `422` | ✅ 端點存在 |
| API Key 回傳 `200` | ✅ Open Proxy 正常 |
| 任何 `404` | ❌ Slug 或 API_BASE 有誤 |
| 任何 `401` / `403` | ❌ API Key 無效 |

---

### Step 3：匯入展示商品

```bash
npm run seed
# 等同於：node scripts/seed-products.mjs
```

透過 Open Proxy（API Key）將 9 款示範商品寫入 `product_templates`。
每筆商品的 `custom_data.app_domain` 會自動標記為 `'ec-platform'`。

> 💡 若要匯入自訂商品，複製 `scripts/seed-products.mjs` 為新檔案，修改 `PRODUCTS` 陣列即可。  
> 參考 `scripts/seed-yuan-hsing.mjs`（源興國際企業的範例）。  
> 完整的欄位定義與注入規則請見下方 [§A. 資料注入指引](#a-資料注入指引)。

---

### Step 4：產生公開商品快取

```bash
npm run cache:products
# 等同於：node scripts/generate-cache.mjs
```

拉取 `app_domain === 'ec-platform'` 的商品，寫入 `public/data/cache/product_templates.json`。
讓未登入用戶也能瀏覽商品列表。

---

### Step 5：提交變更並觸發 CI/CD 部署

將 Step 1 修改的 `.env.production` 與 Step 4 產生的商品快取提交至 Git，push 到 `main` 分支觸發自動部署：

```bash
# 確認變更的檔案
git status
# 預期會看到：
#   modified: .env.production
#   modified: public/data/cache/product_templates.json

# 提交
git add .env.production public/data/cache/
git commit -m "chore: 切換租戶至 <租戶名稱>"

# Push 到 main → 自動觸發 GitHub Actions 部署
git push origin main
```

**CI/CD 自動執行流程**（[deploy-staging.yml](../.github/workflows/deploy-staging.yml)）：

1. GitHub Actions 偵測 `main` 分支 push
2. 呼叫組織共用的 `staging-deploy.yml` reusable workflow
3. 在 staging VM 上自動 build Docker image（讀取 `.env.production`）
4. 啟動新容器，替換舊容器

部署完成後（通常 1-3 分鐘），即可在線上驗證。

> 💡 也可透過 GitHub → Actions → 「部署到 Staging」→ Run workflow 手動觸發部署（`workflow_dispatch`）。
>
> ⚠️ Push 時 `paths-ignore` 排除了 `*.md` 和 `docs/**`，因此修改文件不會觸發部署。只有 `.env.production`、程式碼或快取等檔案變更才會觸發。

---

### Step 6：端到端驗證

```bash
npm test
# 等同於：node scripts/e2e-api-test.mjs
```

測試涵蓋：Custom App Auth、Ext Proxy CRUD、Open Proxy、Proxy Query。

所有測試通過 → 串接完成 ✅

---

## 5. 程式碼關鍵位置速查

### 前端（改完需重新 build）

| 檔案 | 變數 | 用途 |
|------|------|------|
| `src/js/utils/config.js:11` | `VITE_API_BASE` | API 基底 URL |
| `src/js/utils/config.js:14` | `VITE_APP_SLUG` | Custom App 識別碼 |
| `src/js/utils/config.js:63` | `APP_DOMAIN` | 資料隔離標識（硬編碼 `'ec-platform'`） |
| `src/js/utils/api.js:82` | — | 註冊 URL = `{API_BASE}/custom-app-auth/{SLUG}/register` |
| `src/js/utils/api.js:103` | — | 登入 URL = `{API_BASE}/custom-app-auth/{SLUG}/login` |

### 伺服器端腳本（執行時讀取 .env）

| 腳本 | 使用的環境變數 |
|------|---------------|
| `scripts/seed-products.mjs` | `VITE_API_BASE`, `AIGO_API_KEY` |
| `scripts/generate-cache.mjs` | `VITE_API_BASE`, `AIGO_API_KEY` |
| `scripts/e2e-api-test.mjs` | `VITE_API_BASE`, `VITE_APP_SLUG`, `AIGO_API_KEY` |
| `scripts/setup-references.mjs` | `VITE_API_BASE`, `AIGO_APP_ID`, `VITE_APP_SLUG`, `AIGO_API_KEY`, `AIGO_BUILDER_EMAIL`, `AIGO_BUILDER_PASSWORD` |
| `scripts/switch-tenant.sh` | 由命令列參數產生 .env，不直接讀取 |

---

## 6. 資料隔離策略（APP_DOMAIN）

- **硬編碼值**：`'ec-platform'`（`src/js/utils/config.js:63`）
- **作用**：所有商品/訂單的 `custom_data` 注入 `{ app_domain: 'ec-platform' }`，查詢時自動過濾
- **跨租戶**：不同租戶的資料天然隔離，`APP_DOMAIN` 保持 `'ec-platform'` 即可，不需更改

> 💡 若同一租戶下有多個 EC Platform 實例需分開資料，可改為環境變數驅動：
> ```javascript
> // config.js
> export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'ec-platform';
> ```
> 然後在 `.env.production` 加入 `VITE_APP_DOMAIN=my-custom-domain`。

---

## A. 資料注入指引

本章節提供完整的 API 呼叫規格，讓 AI Agent 或人類能正確將商品、訂單、客戶等資料注入目標租戶。

---

### A.1 兩種認證模式

EC Platform 使用兩種 API 認證方式，**用途與權限完全不同**：

| | Open Proxy（`X-API-Key`） | Ext Proxy（`Bearer Token`） |
|---|---|---|
| **Header** | `X-API-Key: sk_live_xxx` | `Authorization: Bearer <JWT>` |
| **端點前綴** | `/open/proxy/{table}` | `/ext/proxy/{table}` |
| **適用場景** | 伺服器端腳本（seed、cache） | 前端用戶操作（結帳、查訂單） |
| **身份** | App 層級（無特定用戶） | 已登入的消費者用戶 |
| **預設權限** | 依 reference 定義（通常 read + create） | 依 reference 定義 |
| **安全性** | ⚠️ API Key 絕不可暴露於前端 | ✅ 可安全用於瀏覽器 |

**選用原則**：

- **批量注入商品** → Open Proxy（API Key），因為是伺服器端操作，不需要消費者身份
- **建立訂單** → 兩者皆可；前端結帳用 Ext Proxy，後端腳本批量灌訂單可用 Open Proxy
- **查詢** → 前端用 Ext Proxy（自動帶用戶 context），腳本用 Open Proxy

#### 取得 Ext Proxy Token（消費者 JWT）

```bash
# 註冊新用戶（取得 access_token）
curl -X POST "${API_BASE}/custom-app-auth/${SLUG}/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass1234!","display_name":"Test User"}'

# 登入現有用戶
curl -X POST "${API_BASE}/custom-app-auth/${SLUG}/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass1234!"}'

# 回傳格式：
# { "access_token": "eyJ...", "refresh_token": "xxx", "expires_in": 3600, "user": {...} }
```

---

### A.2 `custom_data.app_domain` 注入規則

> ⚠️ **每筆寫入的資料都必須在 `custom_data` 中包含 `app_domain` 欄位，否則前端查不到。**

EC Platform 的前端在查詢時會自動注入過濾條件：

```javascript
// api.js 中的 domainFilter()
{ column: 'custom_data', op: 'ilike', value: '%app_domain%ec-platform%' }
```

因此，所有透過腳本注入的資料，`custom_data` 都必須包含：

```json
{
  "custom_data": {
    "app_domain": "ec-platform",
    "...其他自訂欄位..."
  }
}
```

- 前端 `api.js` 的 `proxy.create()` 會**自動注入** `app_domain`，不需手動處理
- 伺服器端腳本直接呼叫 API，**必須手動加入** `app_domain` 到 `custom_data`
- 若遺漏 `app_domain`，前端的商品列表、訂單查詢都**不會顯示該筆資料**

---

### A.3 API 回傳格式處理

AI GO 的寫入回傳有兩種可能格式，腳本中需做正規化：

```javascript
// AI GO Create 回傳可能是：
// 格式 A：{ id: "uuid", data: { name: "...", ... } }
// 格式 B：{ id: "uuid", name: "...", ... }（直接扁平物件）

const result = await res.json();
const record = (result && result.id && result.data)
  ? { id: result.id, ...result.data }  // 格式 A → 展開
  : result;                             // 格式 B → 直接用

// Update 回傳：{ id: "uuid", updated: true }
// 需要再 query 一次才能取得完整更新後資料
```

---

### A.4 系統表 Schema 與注入範例

EC Platform 使用以下 5 張核心表（含 11 張引用表中最常操作的）。
每張表列出：可用欄位、必填規則、enum 值、以及完整的 curl 範例。

---

#### A.4.1 `product_templates`（商品）

**權限**：read / create / update

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | ✅ | 商品名稱 |
| `type` | string | - | 商品類型：`consu`（消耗品）/ `service`（服務）/ `product`（庫存品） |
| `list_price` | number | ✅ | 售價 |
| `standard_price` | number | - | 成本價 |
| `sale_ok` | boolean | - | 是否可銷售（預設 `true`） |
| `active` | boolean | - | 是否啟用（預設 `true`） |
| `description_sale` | string | - | 銷售說明（短） |
| `default_code` | string | - | 商品編號（SKU） |
| `image_url` | string | - | 商品主圖 URL |
| `categ_id` | integer | - | 分類 ID（FK → product_categories） |
| `custom_data` | JSONB | ✅* | 自訂資料（**必須包含 `app_domain`**） |

**`custom_data` 建議結構**（EC Platform 前端會讀取的欄位）：

```json
{
  "app_domain": "ec-platform",
  "name_en": "English Name",
  "description_en": "English description",
  "category_display": "包款",
  "category_en": "Bags",
  "tags": ["新品", "熱銷"],
  "colors": [
    { "name": "經典黑", "hex": "#2D3436", "available": true }
  ],
  "sizes": ["S", "M", "L"],
  "rating": 4.8,
  "review_count": 128,
  "material": "義大利植鞣皮革"
}
```

**curl 範例 — 建立商品**（Open Proxy）：

```bash
curl -X POST "${API_BASE}/open/proxy/product_templates" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "經典摺疊手提包",
    "type": "consu",
    "list_price": 12800,
    "sale_ok": true,
    "active": true,
    "description_sale": "義大利植鞣皮革 / 手工打磨",
    "default_code": "BAG-CLASSIC-001",
    "image_url": "/images/products/leather-bag.png",
    "custom_data": {
      "app_domain": "ec-platform",
      "name_en": "Classic Leather Tote",
      "category_display": "包款",
      "category_en": "Bags",
      "tags": ["新品", "熱銷"],
      "colors": [
        { "name": "經典黑", "hex": "#2D3436", "available": true },
        { "name": "焦糖棕", "hex": "#8B6914", "available": true }
      ],
      "sizes": ["S", "M", "L"],
      "rating": 4.8,
      "review_count": 128,
      "material": "義大利植鞣皮革"
    }
  }'
```

**查詢商品**（含 app_domain 過濾）：

```bash
# Open Proxy — 全量查詢（伺服器端）
curl -X POST "${API_BASE}/open/proxy/product_templates/query" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      { "column": "custom_data", "op": "ilike", "value": "%app_domain%ec-platform%" }
    ],
    "order_by": [{ "column": "list_price", "direction": "desc" }],
    "limit": 100
  }'
```

---

#### A.4.2 `sale_orders`（訂單）

**權限**：read / create / update

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `state` | enum | ✅ | `draft` \| `sent` \| `sale` \| `done` \| `cancel` |
| `date_order` | string | ✅ | 訂單日期，格式 `YYYY-MM-DD`（NOT NULL） |
| `amount_total` | number | ✅ | 總金額（含運費） |
| `amount_untaxed` | number | - | 未稅金額 |
| `name` | string | - | 訂單編號（AI GO 可自動產生） |
| `customer_id` | integer | - | 客戶 ID（FK → customers） |
| `note` | string | - | 備註 |
| `invoice_status` | enum | - | `no` \| `to_invoice` \| `invoiced` |
| `carrier_type` | string | - | 物流類型 |
| `delivery_method` | string | - | 配送方式 |
| `invoice_format` | string | - | 發票格式 |
| `tax_type` | string | - | 稅別 |
| `custom_data` | JSONB | ✅* | 自訂資料（**必須包含 `app_domain`**） |

**`custom_data` 建議結構**（EC Platform 前端 checkout.js 寫入的格式）：

```json
{
  "app_domain": "ec-platform",
  "user_id": "uuid-of-logged-in-user",
  "customer_name": "王小明",
  "customer_phone": "0912-345-678",
  "customer_email": "user@example.com",
  "shipping_address": "10617 台北市大安區敦化南路 100 號",
  "shipping_method": "home",
  "shipping_fee": 80,
  "invoice_type": "mobile",
  "payment_method": "credit",
  "order_date": "2026-04-09T12:00:00.000Z",
  "items": [
    {
      "product_id": "uuid-of-product",
      "name": "經典摺疊手提包",
      "quantity": 2,
      "unit_price": 12800,
      "subtotal": 25600,
      "variant": { "color": "經典黑", "size": "M" }
    }
  ]
}
```

> ⚠️ `date_order` 是 AI GO 系統表的 NOT NULL 欄位，**漏填會導致 500 錯誤**。

**curl 範例 — 建立訂單**（Open Proxy）：

```bash
curl -X POST "${API_BASE}/open/proxy/sale_orders" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "draft",
    "date_order": "2026-04-09",
    "amount_total": 25680,
    "amount_untaxed": 25600,
    "invoice_status": "no",
    "note": "測試訂單",
    "custom_data": {
      "app_domain": "ec-platform",
      "customer_name": "王小明",
      "customer_email": "user@example.com",
      "customer_phone": "0912-345-678",
      "shipping_address": "台北市大安區",
      "shipping_method": "home",
      "shipping_fee": 80,
      "invoice_type": "mobile",
      "payment_method": "credit",
      "order_date": "2026-04-09T12:00:00.000Z",
      "items": [
        {
          "product_id": "uuid",
          "name": "經典摺疊手提包",
          "quantity": 2,
          "unit_price": 12800,
          "subtotal": 25600
        }
      ]
    }
  }'
```

**更新訂單狀態**：

```bash
curl -X PATCH "${API_BASE}/open/proxy/sale_orders/${ORDER_ID}" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "state": "sale", "invoice_status": "to_invoice" }'
```

---

#### A.4.3 `sale_order_lines`（訂單明細）

**權限**：read / create

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `order_id` | UUID | ✅ | 所屬訂單 ID（FK → sale_orders） |
| `name` | string | ✅ | 商品名稱 |
| `product_uom_qty` | number | ✅ | 數量 |
| `price_unit` | number | ✅ | 單價 |
| `price_total` | number | ✅ | 小計（= qty × unit） |
| `product_id` | UUID | - | 產品 ID（FK → product_products，非 product_templates） |
| `custom_data` | JSONB | ✅* | 自訂資料（**必須包含 `app_domain`**） |

> ⚠️ `product_id` 的 FK 指向 `product_products`（非 `product_templates`），因此 EC Platform 將 `product_template_id` 放在 `custom_data` 中。

**curl 範例 — 建立訂單明細**：

```bash
curl -X POST "${API_BASE}/open/proxy/sale_order_lines" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "uuid-of-sale-order",
    "name": "經典摺疊手提包 - 經典黑 / M",
    "product_uom_qty": 2,
    "price_unit": 12800,
    "price_total": 25600,
    "custom_data": {
      "app_domain": "ec-platform",
      "product_template_id": "uuid-of-product-template",
      "variant": { "color": "經典黑", "size": "M" }
    }
  }'
```

---

#### A.4.4 `customers`（客戶）

**權限**：read / create / update

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | ✅ | 客戶名稱 |
| `email` | string | - | 電子郵件 |
| `phone` | string | - | 電話 |
| `customer_type` | string | - | 客戶類型 |
| `status` | string | - | 狀態 |
| `custom_data` | JSONB | ✅* | 自訂資料（**必須包含 `app_domain`**） |

**curl 範例 — 建立客戶**：

```bash
curl -X POST "${API_BASE}/open/proxy/customers" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "王小明",
    "email": "wang@example.com",
    "phone": "0912-345-678",
    "customer_type": "individual",
    "custom_data": {
      "app_domain": "ec-platform",
      "source": "ec-website",
      "registered_at": "2026-04-09T12:00:00Z"
    }
  }'
```

---

#### A.4.5 其他唯讀表

以下表僅有 **read** 權限，不需要腳本注入，列出供查詢參考：

| 表名 | 欄位 | 說明 |
|------|------|------|
| `product_products` | `id`, `product_tmpl_id`, `default_code`, `active`, `custom_data` | 產品變體（自動建立） |
| `product_categories` | `id`, `name`, `parent_id`, `custom_data` | 商品分類 |
| `stock_quants` | `id`, `product_id`, `location_id`, `quantity`, `reserved_quantity` | 庫存數量 |

---

### A.5 進階查詢 API（POST /query）

所有系統表都支援 `POST /{table}/query`，可組合多條件過濾與排序：

```javascript
// 查詢 body 結構
{
  "filters": [
    { "column": "custom_data", "op": "ilike", "value": "%app_domain%ec-platform%" },
    { "column": "list_price", "op": "gte", "value": 1000 },
    { "column": "active", "op": "eq", "value": true }
  ],
  "order_by": [
    { "column": "list_price", "direction": "desc" }
  ],
  "limit": 50,
  "offset": 0,
  "search": "皮革"  // 全文搜尋（可選）
}
```

**支援的 filter 運算子**：

| op | 說明 | 範例 |
|----|------|------|
| `eq` | 等於 | `{ "column": "state", "op": "eq", "value": "draft" }` |
| `neq` | 不等於 | `{ "column": "state", "op": "neq", "value": "cancel" }` |
| `gt` / `gte` | 大於 / 大於等於 | `{ "column": "list_price", "op": "gte", "value": 1000 }` |
| `lt` / `lte` | 小於 / 小於等於 | `{ "column": "amount_total", "op": "lt", "value": 5000 }` |
| `ilike` | 不分大小寫模糊比對 | `{ "column": "name", "op": "ilike", "value": "%皮革%" }` |
| `in` | 在列表中 | `{ "column": "state", "op": "in", "value": ["draft","sale"] }` |

---

### A.6 通用資料注入腳本模板

以下為可直接複製使用的 Node.js 腳本模板，支援商品 + 訂單的批量注入：

```javascript
/**
 * 通用資料注入腳本模板
 * 複製此檔案並修改 PRODUCTS 與 ORDERS 陣列即可
 *
 * 執行方式：node scripts/seed-my-tenant.mjs
 * 前置條件：.env 已設定 VITE_API_BASE 和 AIGO_API_KEY
 */
import 'dotenv/config';

const API_BASE = process.env.VITE_API_BASE;
const API_KEY  = process.env.AIGO_API_KEY;
const APP_DOMAIN = 'ec-platform';  // 資料隔離標識

if (!API_BASE || !API_KEY) {
  console.error('❌ 需要 VITE_API_BASE 和 AIGO_API_KEY');
  process.exit(1);
}

// ── 通用 API 呼叫 ──

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
    throw new Error(`${res.status}: ${JSON.stringify(result).substring(0, 200)}`);
  }
  // 正規化回傳格式
  return (result && result.id && result.data)
    ? { id: result.id, ...result.data }
    : result;
}

async function queryRecords(table, filters = [], limit = 100) {
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

// ── 商品資料（自行替換）──

const PRODUCTS = [
  {
    name: '範例商品',
    type: 'consu',
    list_price: 1000,
    sale_ok: true,
    active: true,
    description_sale: '範例說明',
    default_code: 'SAMPLE-001',
    custom_data: {
      app_domain: APP_DOMAIN,
      category_display: '分類名',
      category_en: 'Category',
      tags: ['新品'],
      rating: 4.5,
      review_count: 0,
    },
  },
  // ... 更多商品 ...
];

// ── 訂單資料（可選，自行替換）──

const ORDERS = [
  // {
  //   state: 'draft',
  //   date_order: '2026-04-09',
  //   amount_total: 1000,
  //   amount_untaxed: 1000,
  //   invoice_status: 'no',
  //   custom_data: {
  //     app_domain: APP_DOMAIN,
  //     customer_name: '測試客戶',
  //     customer_email: 'test@example.com',
  //     ...
  //   },
  //   lines: [
  //     { name: '範例商品', qty: 1, unit_price: 1000 },
  //   ],
  // },
];

// ── 主流程 ──

async function main() {
  console.log(`\n=== 資料注入（Domain: ${APP_DOMAIN}）===\n`);

  // 1. 注入商品
  console.log('📦 注入商品...');
  const productIds = [];
  for (const product of PRODUCTS) {
    try {
      const result = await createRecord('product_templates', product);
      console.log(`  ✅ ${product.name} — ID: ${result.id}`);
      productIds.push(result.id);
    } catch (e) {
      console.log(`  ❌ ${product.name} — ${e.message}`);
    }
  }

  // 2. 注入訂單（可選）
  if (ORDERS.length > 0) {
    console.log('\n📋 注入訂單...');
    for (const order of ORDERS) {
      try {
        const { lines, ...orderData } = order;
        const result = await createRecord('sale_orders', orderData);
        console.log(`  ✅ 訂單 — ID: ${result.id}`);

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
          } catch (e) {
            console.log(`    ❌ 訂單明細 ${line.name} — ${e.message}`);
          }
        }
      } catch (e) {
        console.log(`  ❌ 訂單 — ${e.message}`);
      }
    }
  }

  // 3. 驗證
  console.log('\n📊 驗證...');
  const products = await queryRecords('product_templates', [
    { column: 'custom_data', op: 'ilike', value: `%app_domain%${APP_DOMAIN}%` }
  ]);
  console.log(`  商品總數（${APP_DOMAIN}）：${products.length}`);

  console.log('\n=== 完成 ===');
}

main().catch(e => {
  console.error('❌ 注入失敗:', e.message);
  process.exit(1);
});
```

---

### A.7 批量注入注意事項

| 項目 | 說明 |
|------|------|
| **冪等性** | Open Proxy POST 不做重複檢查。相同 `default_code` 的商品可重複建立。建議注入前先 query 確認是否已存在 |
| **速率限制** | AI GO API 無公開的 rate limit 文件，但建議批量注入時每筆之間加 `await`（串行），避免並發 | 
| **欄位缺失** | 若 payload 中包含 reference 未定義的欄位，API 會忽略該欄位（不會報錯） |
| **FK 約束** | `sale_order_lines.order_id` 必須指向已存在的 `sale_orders.id`，先建訂單再建明細 |
| **JSONB 過濾** | `ilike` 過濾 JSONB 欄位時使用的是序列化後的 JSON 字串比對，冒號後可能有空格，因此用 `%app_domain%ec-platform%`（省略冒號）更穩定 |
| **圖片 URL** | `image_url` 可使用相對路徑（如 `/images/products/xxx.png`）或絕對 URL。相對路徑會相對於 EC Platform 部署的域名 |

---

## 7. FAQ

### Q：Login/Register URL 的路徑模式一定是 `/custom-app-auth/{slug}/...` 嗎？

**是的。** 前端 `api.js` 硬編碼了此路徑模式。Login URL / Register URL 主要用來**驗證** API_BASE 和 Slug 的正確性，不會被程式碼直接使用。

### Q：新租戶已有商品資料，不需要 seed？

跳過 Step 3 即可。但仍需執行 Step 4（generate-cache）產生本地 JSON 快取供未登入用戶瀏覽。
快取只包含 `app_domain === 'ec-platform'` 的商品。

### Q：可以多租戶共用同一個實例嗎？

**不建議。** `VITE_APP_SLUG` 和 `VITE_API_BASE` 在 build time 打包進 JS，一個 build 只對應一個租戶。
需要多租戶請部署多個 Docker 容器，各自使用不同 port。

### Q：切換租戶後舊快取怎麼辦？

`npm run cache:products` 會完整覆寫為新租戶的資料，舊快取自動被取代。

### Q：`setup-references.mjs` 什麼時候需要跑？

僅在目標租戶的 Builder **尚未建立** EC Platform 所需的 11 張系統表引用時才需要。
正常流程下，管理員會先在 AI GO 後台建好引用，此腳本不需要執行。
若確實需要執行，需額外提供 `AIGO_APP_ID`（App UUID），將其加入 `.env` 後執行 `npm run setup`。

---

## 8. 成功驗證標準

租戶抽換完成後，必須通過以下所有驗證項目，才視為串接成功。

**線上驗證 URL**：`https://model-ec-platform.staging.ai-go.app`

---

### 8.1 商品資料可見（未登入）

打開線上 URL 首頁，**無需登入**即應看到商品列表。

| 檢查項目 | 預期結果 |
|---------|---------|
| 首頁載入 | 頁面正常顯示，無白屏、無 console 錯誤 |
| 商品列表 | 顯示已匯入的商品（名稱、價格、圖片） |
| 商品數量 | 與 `npm run seed` 匯入的數量一致 |
| 商品詳情頁 | 點擊商品可進入詳情頁，顯示完整說明、顏色/尺寸選項 |
| 分類篩選 | 左側分類 checkbox 可正常篩選商品 |

> 未登入瀏覽依賴 `public/data/cache/product_templates.json`。若商品不顯示，先確認 Step 4（`npm run cache:products`）是否執行成功。

---

### 8.2 用戶認證流程（註冊 → 登入 → 登出）

| 檢查項目 | 預期結果 |
|---------|---------|
| 註冊 | 在帳戶頁填寫 email / 密碼 / 顯示名稱，成功註冊並自動登入 |
| 登入 | 登出後重新登入，Header 顯示用戶名稱 |
| Token 刷新 | 長時間停留後操作仍不會被踢出（自動 refresh） |
| 登出 | 點擊登出按鈕，回到未登入狀態 |

---

### 8.3 訂單全流程（加入購物車 → 結帳 → 查詢訂單）

| 檢查項目 | 預期結果 |
|---------|---------|
| 加入購物車 | 選擇顏色/尺寸後加入，購物車 badge 數字更新 |
| 購物車頁 | 顯示正確商品、數量、小計 |
| 結帳頁 | 需登入才能進入；填寫收件/物流/發票/付款資訊 |
| 訂單建立 | 點擊「完成訂單」後顯示成功畫面，含訂單編號 |
| 訂單查詢 | 帳戶頁「我的訂單」列出剛建立的訂單，狀態為 `draft` |
| 訂單明細 | 訂單中包含正確的商品名稱、數量、金額 |

---

### 8.4 API 端到端驗證（自動化）

```bash
npm test
# 等同於：node scripts/e2e-api-test.mjs
```

| 測試模組 | 涵蓋項目 |
|---------|---------|
| Custom App Auth | register → login → me → refresh → logout |
| product_templates | list（含 domain 過濾）→ get（by ID query） |
| sale_orders | create → get → update → list |
| sale_order_lines | create → list |
| customers / stock_quants | list（權限驗證） |
| Open Proxy | API Key 讀取 product_templates |
| Proxy Query | POST 進階查詢 + 排序驗證 |

**通過標準**：全部測試通過，`0 失敗`。

```
╔══════════════════════════════════════════════╗
║  結果：N 通過 / 0 失敗                       ║
╚══════════════════════════════════════════════╝
```

---

### 8.5 常見驗證失敗排查

| 現象 | 可能原因 | 排查方式 |
|------|---------|---------|
| 首頁白屏 | `VITE_API_BASE` 或 `VITE_APP_SLUG` 未正確打包 | 檢查 `.env.production` → 重新 `docker compose build` |
| 商品列表空白 | 快取未產生 | 執行 `npm run cache:products` → 重新部署 |
| 登入回傳 404 | Slug 不正確 | 用 curl 驗證 Login URL |
| 結帳建立訂單 500 | `date_order` 漏填或 enum 值不合法 | 檢查 console，確認 payload 含 `date_order` |
| 訂單查不到 | `custom_data.app_domain` 未注入 | 用 Open Proxy query 該訂單，檢查 `custom_data` |
| E2E 測試 Auth 失敗 | API Key 或 Slug 不匹配 | 重新確認 6 項輸入資訊是否正確 |

