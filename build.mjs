import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2021',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  outfile: 'dist/ha-controls.js',
  define: { __VERSION__: JSON.stringify(pkg.version) },
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: '.', port: 5000 });
  console.log(`Demo: http://localhost:${port}/demo/`);
} else {
  await build(options);
}
