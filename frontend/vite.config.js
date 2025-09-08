import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Add this line - allows both localhost and 127.0.0.1
    port: 5173,      // Add this line - explicitly set the port
    proxy: {
      '/uploads': 'http://localhost:5000'
    }
  }
})