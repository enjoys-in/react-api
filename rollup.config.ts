import { defineConfig, type RollupOptions } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const entries = [
  { input: './src/idb/index.ts', dir: 'dist/idb' },
  { input: './src/ofs/index.ts', dir: 'dist/ofs' },
  { input: './src/events/index.ts', dir: 'dist/events' },
  { input: './src/cache-storage/index.ts', dir: 'dist/cache-storage' },
];

const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'dexie',
  'dexie-observable',
  'dot-object',
];

// JS bundles (ESM + CJS) per entry
const jsBundles: RollupOptions[] = entries.map(({ input, dir }) => ({
  input,
  output: [
    { file: `${dir}/index.mjs`, format: 'esm', banner: '"use client";' },
    { file: `${dir}/index.js`, format: 'cjs', exports: 'named' as const, banner: '"use client";' },
  ],
  external,
  onwarn(warning, warn) {
    if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
    warn(warning);
  },
  plugins: [
    resolve({ extensions: ['.ts', '.tsx', '.js'] }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationDir: undefined,
      emitDeclarationOnly: false,
      outDir: undefined,
    }),
    terser(),
  ],
}));

// DTS bundles per entry
const dtsBundles: RollupOptions[] = entries.map(({ input, dir }) => ({
  input,
  output: { file: `${dir}/index.d.ts`, format: 'esm' },
  external,
  plugins: [dts()],
}));

export default defineConfig([...jsBundles, ...dtsBundles]);
