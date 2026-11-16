import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/Chamber-Loading/',
  plugins: [tailwindcss()],
  esbuild: {
    jsx: 'automatic',
  },
});
