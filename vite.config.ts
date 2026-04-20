import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['BILANO-ICON.png'], // Pastikan ikon ini ada di folder public
      manifest: {
        name: 'BILANO - Financial Tracker',
        short_name: 'BILANO',
        description: 'Aplikasi pencatat keuangan dan analisa performa aset.',
        theme_color: '#0f172a', // Warna background HP saat loading (Slate 900)
        background_color: '#f8fafc', // Warna background aplikasi (Slate 50)
        display: 'standalone', // Ini yang membuatnya tampil FULLSCREEN tanpa address bar browser
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
  ]
})