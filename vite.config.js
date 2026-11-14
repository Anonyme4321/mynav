import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Sous-chemin pour GitHub Pages (https://<user>.github.io/mynav/) ; "/" en local
  base: process.env.VITE_BASE || '/',
  server: { port: 5173 },
})
