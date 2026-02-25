import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Kati? - Expense Tracker',
                short_name: 'Kati?',
                description: 'Track expenses, split bills, and manage your journal.',
                theme_color: '#3b82f6',
                icons: [
                    {
                        src: 'king.jpg',
                        sizes: '192x192',
                        type: 'image/jpeg'
                    },
                    {
                        src: 'king.jpg',
                        sizes: '512x512',
                        type: 'image/jpeg'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}']
            }
        })
    ],
    server: {
        allowedHosts: true,
    }
})

