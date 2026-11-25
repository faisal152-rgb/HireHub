import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to network (generates Network URL for phone/device access)
    proxy: {
      '/api': {
        target: 'https://bloodlink-oo9q.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
