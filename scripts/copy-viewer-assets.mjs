import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'public', 'ej2-pdfviewer-lib');

const sources = [
  join(root, 'node_modules', '@syncfusion', 'ej2-pdfviewer', 'dist', 'ej2-pdfviewer-lib'),
  join(root, 'node_modules', '@syncfusion', 'ej2-react-pdfviewer', 'dist', 'ej2-pdfviewer-lib')
];

const assets = ['pdfium.js', 'pdfium.wasm'];

const source = sources.find((candidate) => existsSync(candidate));

if (!source) {
  console.error('[copy-viewer-assets] Syncfusion PDF viewer library folder not found in node_modules.');
  process.exit(1);
}

mkdirSync(target, { recursive: true });

for (const asset of assets) {
  const from = join(source, asset);
  if (!existsSync(from)) {
    console.error('[copy-viewer-assets] Missing asset:', from);
    process.exit(1);
  }
  copyFileSync(from, join(target, asset));
  console.log('[copy-viewer-assets] copied', asset);
}
