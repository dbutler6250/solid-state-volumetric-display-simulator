import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
  },
  plugins: [react()],
});
