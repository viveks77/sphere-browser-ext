import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import path from 'path';

const PATH_ALIAS = path.resolve(__dirname, '');

export default defineConfig({
  manifest: {
    permissions: ['storage'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': PATH_ALIAS,
      },
    },
  }),
  modules: ['@wxt-dev/module-react'],
});
