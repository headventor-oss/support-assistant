import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiDevPlugin } from './dev/api-plugin'
import 'dotenv/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevPlugin()],
})
