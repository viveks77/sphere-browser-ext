import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import path from "path";

export default defineConfig({
  manifest: {
    permissions: ['storage'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, ""),
      }
    }
  }),
  modules: ['@wxt-dev/module-react'],
});
