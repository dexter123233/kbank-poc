import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

if (!existsSync('./dist')) {
  mkdirSync('./dist', { recursive: true });
}

await esbuild.build({
  entryPoints: ['src/worker.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'dist/worker.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

copyFileSync('wrangler.toml', 'dist/wrangler.toml');

console.log('Build complete: dist/worker.js');
