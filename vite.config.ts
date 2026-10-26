import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages menyajikan situs di /<nama-repo>/; BASE_PATH diisi oleh workflow deploy
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
})
