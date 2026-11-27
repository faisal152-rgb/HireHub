<<<<<<< HEAD
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to network (generates Network URL for phone/device access)
    proxy: {
      '/api': {
        target: 'https://hirehub-bn3z.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
=======
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL, // e.g. http://localhost:8000
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, ""), // optional
        },
      },
    },
  };
});
>>>>>>> f9d8ac4 (Update recruiter team empty state and backend fixes)
