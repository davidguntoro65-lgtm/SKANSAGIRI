import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // VITE_BASE_PATH lets each deployment target set its own base:
  //   cPanel (smkn1wonogiri.sch.id/id): leave unset → defaults to "/id/" in prod
  //   Replit Autoscale (root domain):   set VITE_BASE_PATH="/"
  //   Local dev:                         always "/"
  const base = process.env.VITE_BASE_PATH
    ?? (process.env.NODE_ENV === "production" ? "/id/" : "/");
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
