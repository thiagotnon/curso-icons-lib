import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/components'],
      exclude: ['src/assets', 'src/index.ts'],
      insertTypesEntry: true,
      outDir: 'dist',
    }),
  ],
  build: {
    lib: {
      entry: 'src/components/index.ts',
      name: 'paprika-icons',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});
