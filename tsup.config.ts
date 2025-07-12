import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    external: ['koa', 'koa-compose'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
});
