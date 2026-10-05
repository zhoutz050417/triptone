import { readFile, writeFile } from 'node:fs/promises';

// Bundle the existing app without changing the website's implementation.
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const image = (await readFile(new URL('dist/assets/demo.jpg', root))).toString('base64');
const icon = (await readFile(new URL('dist/assets/icon.svg', root))).toString('base64');
const filters = (await read('dist/filters.js')).replace(/^export /gm, '');
const app = (await read('dist/app.js'))
  .replace(/^import .*from '\.\/filters\.js';\r?\n/, '')
  .replaceAll("'assets/demo.jpg'", `'data:image/jpeg;base64,${image}'`);
const script = `${filters}\n${app}`.replaceAll('</script', '<\\/script');
const html = (await read('dist/index.html'))
  .replace('href="assets/icon.svg"', `href="data:image/svg+xml;base64,${icon}"`)
  .replace('<link rel="stylesheet" href="style.css">', `<style>${await read('dist/style.css')}</style>`)
  .replace('<script type="module" src="app.js"></script>', `<script type="module">${script}</script>`);
const destination = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`) : new URL('../triptone-offline.html', root);
await writeFile(destination, html);
console.log('离线页面已生成。');
