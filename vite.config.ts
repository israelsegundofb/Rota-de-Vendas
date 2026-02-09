import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/Rota-de-Vendas/',
    server: {
      port: 3000,
    },
    plugins: [
      react(),
      // Temporarily disabled PWA plugin due to build issues
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   workbox: {
      //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      //   },
      //   manifest: {
      //     name: 'Rota de Vendas Inteligente',
      //     short_name: 'Vendas A.I.',
      //     description: 'Sistema Inteligente de Gestão de Vendas e Rotas',
      //     theme_color: '#1e3a8a',
      //     background_color: '#ffffff',
      //     display: 'standalone'
      //   }
      // })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
