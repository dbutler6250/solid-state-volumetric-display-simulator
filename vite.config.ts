import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  build: {
    // The async Plotly cartesian bundle is the smallest official bundle that supports scatter and heatmap traces.
    chunkSizeWarningLimit: 1500,
  },
  plugins: [react()],
});
