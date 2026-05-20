import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    // Konfigurasi PWA
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['BILANO-ICON.png'], 
      // 🚀 INJEKSI SW.JS (AGAR NOTIFIKASI PWA JALAN)
      workbox: {
        importScripts: ['/sw.js'], 
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'BILANO - Financial Tracker',
        short_name: 'BILANO',
        description: 'Aplikasi pencatat keuangan dan analisa performa aset.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: '/BILANO-ICON.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/BILANO-ICON.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  // 🚀 KUNCI PERBAIKAN VERCEL: KEMBALIKAN "KOMPAS" YANG SEMPAT TERHAPUS!
  // KOMPAS 2: Kasih tau Vercel kalau index.html ada di dalam folder client
  root: path.resolve(__dirname, "client"),
  // KOMPAS 3: Arahkan hasil build ke tempat yang benar
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});