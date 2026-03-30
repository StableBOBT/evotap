import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/domains/shared/index.ts',
    'src/domains/game/index.ts',
    'src/domains/user/index.ts',
    'src/domains/referral/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});
