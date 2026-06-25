import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Admin CRM dev server. Backend runs on :3000, so the admin uses Vite's default :5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
