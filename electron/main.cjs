// Desktop shell (Windows / macOS / Linux). Loads the same web build from dist/
// through a private app:// protocol so fetch() and WebAssembly work like on the web.
const { app, BrowserWindow, protocol, net, shell } = require('electron');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const MIME = {
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

let win = null;
let pendingFile = null;
let rendererReady = false;

const pdfFromArgs = (argv) =>
  argv.find((a) => a.toLowerCase().endsWith('.pdf') && !a.startsWith('--'));

async function sendFile(filePath) {
  if (!filePath) return;
  if (!win || !rendererReady) {
    pendingFile = filePath;
    return;
  }
  const data = await readFile(filePath);
  win.webContents.send('open-file', {
    name: path.basename(filePath),
    base64: data.toString('base64'),
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    title: 'Syncfusion PDF Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.removeMenu();
  // External links open in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('did-finish-load', () => {
    rendererReady = true;
    if (pendingFile) {
      const f = pendingFile;
      pendingFile = null;
      sendFile(f);
    }
  });
  win.loadURL('app://bundle/index.html');
}

// Only one window: a second launch (e.g. double-clicking another PDF) reuses it.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    sendFile(pdfFromArgs(argv));
  });
  // macOS "Open with"
  app.on('open-file', (e, filePath) => {
    e.preventDefault();
    sendFile(filePath);
  });

  app.whenReady().then(() => {
    protocol.handle('app', async (request) => {
      const { pathname } = new URL(request.url);
      const filePath = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
      if (!filePath.startsWith(DIST)) return new Response('Not found', { status: 404 });
      const response = await net.fetch(pathToFileURL(filePath).toString());
      const type = MIME[path.extname(filePath).toLowerCase()];
      return type
        ? new Response(response.body, {
            status: response.status,
            headers: { 'Content-Type': type },
          })
        : response;
    });
    createWindow();
    pendingFile = pendingFile || pdfFromArgs(process.argv.slice(1));
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
