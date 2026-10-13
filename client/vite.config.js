import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev only: the client runs on Vite's port (5173) while the ProxiSpeak
// server owns port 4000. /socket.io (websocket) and /api are proxied to
// the server so dev never runs into a cross-origin wall for those paths.
// The socket itself targets config.js' SERVER_URL; the proxy is the
// same-origin fallback when VITE_SERVER_URL is left empty in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:4000',
      },
    },
  },
});
