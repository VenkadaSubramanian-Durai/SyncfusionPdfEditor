import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps every asset path relative, so the same build works when it is
// hosted on a web server, loaded by Electron (app:// protocol) and by Capacitor.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 10000,
  },
  server: { host: '127.0.0.1', port: 5173 },
});
