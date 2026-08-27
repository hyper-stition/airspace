import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/airspace/',
  server: {
    proxy: {
      // Proxy ADS-B lol API to avoid CORS issues
      '/api/adsb': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/adsb/, ''),
      },
    },
  },
})
