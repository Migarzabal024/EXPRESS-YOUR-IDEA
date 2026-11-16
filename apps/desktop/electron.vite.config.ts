import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Los paquetes del monorepo (@eyi/*) se distribuyen como código fuente TypeScript,
// así que se empaquetan dentro del bundle en lugar de externalizarse.
const workspacePackages = ['@eyi/core', '@eyi/storage-sqlite', '@eyi/editor'];

export default defineConfig({
  main: {
    build: {
      externalizeDeps: { exclude: [...workspacePackages, 'zod'] },
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    build: {
      // El preload corre en sandbox: no puede hacer require() de node_modules,
      // así que todo lo que usa se empaqueta.
      externalizeDeps: false,
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
});
