import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname);
  const env = loadEnv(mode, envDir, '');

  // Build-time diagnostic
  console.log('[VITE BUILD] envDir:', envDir);
  console.log('[VITE BUILD] VITE_GOOGLE_API_KEY:', env.VITE_GOOGLE_API_KEY ? 'SET (' + env.VITE_GOOGLE_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
  console.log('[VITE BUILD] VITE_FIREBASE_API_KEY:', env.VITE_FIREBASE_API_KEY ? 'SET (' + env.VITE_FIREBASE_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
  console.log('[VITE BUILD] VITE_FIREBASE_PROJECT_ID:', env.VITE_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');

  // Determine base path based on environment variable (set in GitHub Actions)
  const basePath = process.env.VITE_BASE_URL || '/Rota-de-Vendas/';

  return {
    base: basePath,
    envDir: envDir,
    server: {
      port: 3000,
    },
    plugins: [
      react(),
    ],
    define: {
      'import.meta.env.VITE_GOOGLE_API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY || ''),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY || ''),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
      'import.meta.env.VITE_RECAPTCHA_SITE_KEY': JSON.stringify(env.VITE_RECAPTCHA_SITE_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

