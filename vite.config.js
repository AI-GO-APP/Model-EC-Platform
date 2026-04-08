import { defineConfig } from 'vite';
import { resolve } from 'path';

// 「示範商城」— Vite MPA 多頁面應用配置
export default defineConfig({
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        collections: resolve(__dirname, 'collections.html'),
        products: resolve(__dirname, 'products.html'),
        productDetail: resolve(__dirname, 'product-detail.html'),
        search: resolve(__dirname, 'search.html'),
        cart: resolve(__dirname, 'cart.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        account: resolve(__dirname, 'account.html'),
        wishlist: resolve(__dirname, 'wishlist.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
    },
  },
  server: {
    port: 5180, // 避免與其他專案衝突
    open: true,
  },
});
