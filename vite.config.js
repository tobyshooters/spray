import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Spray",
        short_name: "Spray",
        description: "Spray wall route setter",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "wall-images",
              expiration: { maxEntries: 20 },
            },
          },
          {
            urlPattern: /holds.*\.json$/,
            handler: "CacheFirst",
            options: {
              cacheName: "holds-data",
              expiration: { maxEntries: 20 },
            },
          },
          {
            urlPattern: /supabase/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-calls",
              expiration: { maxEntries: 50 },
            },
          },
        ],
      },
    }),
  ],
})
