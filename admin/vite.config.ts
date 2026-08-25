import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Port dédié pour pouvoir lancer le site vitrine (frontend/, port 5173 par défaut)
  // et ce panneau admin en même temps en local.
  server: {
    port: 5174,
  },
})
