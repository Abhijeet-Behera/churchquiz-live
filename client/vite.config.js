import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const appMode = process.env.VITE_APP_MODE || 'host';
  const defaultPort = appMode === 'player' ? 5174 : 5173;
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      proxy: {
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true
        },
        '/api': {
          target: 'http://localhost:3000'
        }
      }
    }
  };
});
