#!/bin/bash
# ==================================================================
# EC Platform — 租戶抽換自動化腳本
#
# 用法：
#   bash scripts/switch-tenant.sh \
#     --admin-email "admin@company-x.com" \
#     --admin-password "Admin1234!" \
#     --slug "a1b2c3d4e5f6" \
#     --api-key "sk_live_xxxx..." \
#     --login-url "https://ai-go.app/api/v1/custom-app-auth/a1b2c3d4e5f6/login" \
#     --register-url "https://ai-go.app/api/v1/custom-app-auth/a1b2c3d4e5f6/register"
#
# 此腳本完成 Step 1-4（本機操作）：
#   1. 產生 .env + .env.production
#   2. 驗證端點連通性
#   3. 匯入展示商品
#   4. 產生公開商品快取
#
# 完成後需手動 commit + push 觸發 CI/CD 部署（Step 5）：
#   git add .env.production public/data/cache/
#   git commit -m "chore: 切換租戶至 <租戶名稱>"
#   git push origin main
#
# 前置條件：
#   - 目標租戶的 Custom App 已由管理員開好（含已發佈的系統表引用）
#   - 當前目錄為 EC Platform 專案根目錄
#   - 已安裝 Node.js、curl
#
# 詳細說明請參考 docs/tenant-integration-guide.md
# ==================================================================
set -euo pipefail

# ── 顏色定義 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── 解析命令列參數 ──
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
SLUG=""
API_KEY=""
LOGIN_URL=""
REGISTER_URL=""
SKIP_SEED=false
SKIP_DOCKER=false

print_usage() {
  echo "用法："
  echo "  bash scripts/switch-tenant.sh \\"
  echo "    --admin-email <email> \\"
  echo "    --admin-password <password> \\"
  echo "    --slug <12-hex-chars> \\"
  echo "    --api-key <sk_live_...> \\"
  echo "    --login-url <full-url> \\"
  echo "    --register-url <full-url> \\"
  echo "    [--skip-seed] [--skip-docker]"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --admin-email)    ADMIN_EMAIL="$2";    shift 2 ;;
    --admin-password) ADMIN_PASSWORD="$2"; shift 2 ;;
    --slug)           SLUG="$2";           shift 2 ;;
    --api-key)        API_KEY="$2";        shift 2 ;;
    --login-url)      LOGIN_URL="$2";      shift 2 ;;
    --register-url)   REGISTER_URL="$2";   shift 2 ;;
    --skip-seed)      SKIP_SEED=true;      shift ;;
    --skip-docker)    SKIP_DOCKER=true;    shift ;;
    --help|-h)        print_usage;         exit 0 ;;
    *) echo -e "${RED}❌ 未知參數: $1${NC}"; print_usage; exit 1 ;;
  esac
done

# ── 驗證必要參數 ──
MISSING=()
[[ -z "$ADMIN_EMAIL" ]]    && MISSING+=("--admin-email")
[[ -z "$ADMIN_PASSWORD" ]] && MISSING+=("--admin-password")
[[ -z "$SLUG" ]]           && MISSING+=("--slug")
[[ -z "$API_KEY" ]]        && MISSING+=("--api-key")
[[ -z "$LOGIN_URL" ]]      && MISSING+=("--login-url")
[[ -z "$REGISTER_URL" ]]   && MISSING+=("--register-url")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo -e "${RED}❌ 缺少必要參數: ${MISSING[*]}${NC}"
  echo ""
  print_usage
  exit 1
fi

# ── 從 Login URL 解析 API_BASE ──
API_BASE=$(echo "$LOGIN_URL" | sed "s|/custom-app-auth/${SLUG}/login||")

# 驗證解析結果
if [[ "$API_BASE" == "$LOGIN_URL" ]]; then
  echo -e "${RED}❌ 無法從 Login URL 解析 API_BASE${NC}"
  echo "  Login URL: $LOGIN_URL"
  echo "  Slug:      $SLUG"
  echo "  預期格式:  {API_BASE}/custom-app-auth/{SLUG}/login"
  exit 1
fi

# 驗證 Slug 是否出現在 Login/Register URL 中
if [[ "$LOGIN_URL" != *"$SLUG"* ]]; then
  echo -e "${RED}❌ Login URL 中未包含 Slug ($SLUG)${NC}"
  exit 1
fi
if [[ "$REGISTER_URL" != *"$SLUG"* ]]; then
  echo -e "${RED}❌ Register URL 中未包含 Slug ($SLUG)${NC}"
  exit 1
fi

# ── 顯示摘要 ──
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  EC Platform — 租戶抽換                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  API Base     : ${GREEN}$API_BASE${NC}"
echo -e "  App Slug     : ${GREEN}$SLUG${NC}"
echo -e "  Admin Email  : ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "  Login URL    : $LOGIN_URL"
echo -e "  Register URL : $REGISTER_URL"
echo -e "  Skip Seed    : $SKIP_SEED"
echo -e "  Skip Docker  : $SKIP_DOCKER"
echo ""

# ══════════════════════════════════════════════
# Step 1：產生 .env 檔案
# ══════════════════════════════════════════════
echo -e "${CYAN}Step 1: 產生 .env 檔案${NC}"

cat > .env << EOF
# EC Platform — 由 switch-tenant.sh 自動產生
# 產生時間：$(date +%Y-%m-%dT%H:%M:%S%z)
VITE_API_BASE=${API_BASE}
VITE_APP_SLUG=${SLUG}

# 伺服器端腳本專用（不暴露於前端）
AIGO_API_KEY=${API_KEY}
AIGO_BUILDER_EMAIL=${ADMIN_EMAIL}
AIGO_BUILDER_PASSWORD=${ADMIN_PASSWORD}
EOF

cat > .env.production << EOF
# EC Platform — 生產環境 Vite 變數（公開值，打包進前端 JS）
# 由 switch-tenant.sh 自動產生（$(date +%Y-%m-%dT%H:%M:%S%z)）
VITE_API_BASE=${API_BASE}
VITE_APP_SLUG=${SLUG}
EOF

echo -e "  ${GREEN}✅ .env 已更新${NC}"
echo -e "  ${GREEN}✅ .env.production 已更新${NC}"

# ══════════════════════════════════════════════
# Step 2：驗證端點連通性
# ══════════════════════════════════════════════
echo ""
echo -e "${CYAN}Step 2: 驗證端點連通性${NC}"

VERIFY_FAILED=false

LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [[ "$LOGIN_STATUS" == "404" || "$LOGIN_STATUS" == "000" ]]; then
  echo -e "  ${RED}❌ Login  → HTTP $LOGIN_STATUS${NC}"
  VERIFY_FAILED=true
else
  echo -e "  ${GREEN}✅ Login  → HTTP $LOGIN_STATUS${NC}"
fi

REG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$REGISTER_URL" \
  -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [[ "$REG_STATUS" == "404" || "$REG_STATUS" == "000" ]]; then
  echo -e "  ${RED}❌ Register → HTTP $REG_STATUS${NC}"
  VERIFY_FAILED=true
else
  echo -e "  ${GREEN}✅ Register → HTTP $REG_STATUS${NC}"
fi

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_BASE}/open/proxy/product_templates?limit=1" \
  -H "X-API-Key: $API_KEY" 2>/dev/null || echo "000")
if [[ "$API_STATUS" == "401" || "$API_STATUS" == "403" || "$API_STATUS" == "404" || "$API_STATUS" == "000" ]]; then
  echo -e "  ${RED}❌ API Key → HTTP $API_STATUS${NC}"
  VERIFY_FAILED=true
else
  echo -e "  ${GREEN}✅ API Key → HTTP $API_STATUS${NC}"
fi

if [[ "$VERIFY_FAILED" == "true" ]]; then
  echo ""
  echo -e "${RED}❌ 端點驗證失敗，請檢查輸入資訊是否正確${NC}"
  echo "  .env 檔案已寫入，修正後可重新執行此腳本"
  exit 1
fi

# ══════════════════════════════════════════════
# Step 3：匯入展示商品（可選）
# ══════════════════════════════════════════════
echo ""
if [[ "$SKIP_SEED" == "true" ]]; then
  echo -e "${YELLOW}Step 3: 跳過匯入商品（--skip-seed）${NC}"
else
  echo -e "${CYAN}Step 3: 匯入展示商品${NC}"
  node scripts/seed-products.mjs
fi

# ══════════════════════════════════════════════
# Step 4：產生公開商品快取
# ══════════════════════════════════════════════
echo ""
echo -e "${CYAN}Step 4: 產生公開商品快取${NC}"
node scripts/generate-cache.mjs

# ══════════════════════════════════════════════
# Step 5：提示 commit + push 觸發 CI/CD 部署
# ══════════════════════════════════════════════
echo ""
echo -e "${CYAN}Step 5: 提交變更並觸發 CI/CD 部署${NC}"
if [[ "$SKIP_DOCKER" == "true" ]]; then
  echo -e "  ${YELLOW}請手動執行以下 git 指令觸發 CI/CD 部署：${NC}"
else
  echo -e "  ${YELLOW}請執行以下 git 指令觸發 CI/CD 部署：${NC}"
fi
echo ""
echo "    git add .env.production public/data/cache/"
echo "    git commit -m \"chore: 切換租戶至 <租戶名稱>\""
echo "    git push origin main"
echo ""
echo -e "  Push 後 GitHub Actions 會自動 build Docker 並部署到 staging VM。"
echo -e "  部署通常需要 1-3 分鐘，可在 GitHub Actions 頁面追蹤進度。"

# ══════════════════════════════════════════════
# Step 6：E2E 驗證（部署完成後執行）
# ══════════════════════════════════════════════
echo ""
echo -e "${CYAN}Step 6: E2E 測試（部署完成後執行）${NC}"
echo -e "  部署完成後，執行以下指令驗證："
echo "    npm test"
echo ""

# ══════════════════════════════════════════════
# 完成（本機部分）
# ══════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ 本機操作完成（Step 1-4）                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "  .env              → 本機腳本用（gitignored）"
echo "  .env.production   → 需 commit + push（git tracked）"
echo "  商品快取           → public/data/cache/（需 commit + push）"
echo ""
echo -e "  ${YELLOW}⏳ 下一步：commit + push → 等待 CI/CD 部署 → npm test 驗證${NC}"
echo ""
