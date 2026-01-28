import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'public',
  publicDir: false,
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'data/**/*',
          dest: 'data'
        }
      ]
    })
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true
  }
});
