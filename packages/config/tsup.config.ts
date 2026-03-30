import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/env.ts', 'src/constants.ts', 'src/features.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});
