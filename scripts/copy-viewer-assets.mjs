// Copies the Syncfusion PDF Viewer engine (PDFium WebAssembly) into public/
// so the viewer runs fully offline on web, desktop (Electron) and mobile (Capacitor).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(
  root,
  'node_modules',
  '@syncfusion',
  'ej2-pdfviewer',
  'dist',
  'ej2-pdfviewer-lib',
);
const target = join(root, 'public', 'ej2-pdfviewer-lib');

if (!existsSync(source)) {
  console.error(`[copy-viewer-assets] Not found: ${source}\nRun "npm install" first.`);
  process.exit(1);
}
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log(`[copy-viewer-assets] Copied PDF Viewer engine to ${target}`);
