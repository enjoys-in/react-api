import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    './src/idb/index.ts',
    './src/ofs/index.ts',
    './src/react-event/index.ts',
    './src/cache-storage/index.ts'
  ],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  clean: true,
  treeshake: true,
  minify: true,
});
