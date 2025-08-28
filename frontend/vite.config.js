import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()], // This was missing - needed for React JSX
  server: {
    proxy: {
      '/uploads': 'http://localhost:5000'
    }
  }
})