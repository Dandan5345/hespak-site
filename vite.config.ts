import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// For GitHub Pages set BASE env var: BASE=/hespak-site/ npx vite build
// For Firebase (default): npx vite build
export default defineConfig({
  base: process.env.BASE || '/',
  plugins: [react(), tailwindcss()],
})
