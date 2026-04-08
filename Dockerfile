# Stage 1: 建置 Vite 專案
FROM node:20-alpine AS builder
WORKDIR /app

# 複製 package.json 和 package-lock.json (如果有) 先進行依賴安裝
COPY package*.json ./
RUN npm install --ignore-scripts

# 複製所有檔案
COPY . .

# 執行生產環境建置
RUN npm run build

# Stage 2: 使用 Nginx 伺服器託管靜態檔案
FROM nginx:alpine

# 複製自訂 Nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 將建置結果從 builder 階段複製到 Nginx 的根目錄
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
