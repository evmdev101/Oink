import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset URLs relative so the build works at any GitHub Pages
// subpath (e.g. /oink2026/) as well as a custom domain.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-ethers": ["ethers"],
          "vendor-react": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
})
