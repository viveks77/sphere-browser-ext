import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import path from "path";

console.log(path.resolve(__dirname, "src"));;

// See https://wxt.dev/api/config.html
export default defineConfig({
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
