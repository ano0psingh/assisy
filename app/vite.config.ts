import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        feed: resolve(__dirname, 'feed.html'),
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
})
