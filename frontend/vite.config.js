import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable JSX in .js files
      include: "**/*.{jsx,js}",
    }),
  ],
  resolve: {
    alias: {
      // Add any path aliases here if needed
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000, // Match CRA's default port
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // Handle environment variables
  envPrefix: 'VITE_',
}); 