// Exposes a minimal, safe bridge to the web app (see src/platform.ts).
const { contextBridge, ipcRenderer } = require('electron');

// Files can arrive before the React app subscribes, so keep the latest one.
let pending = null;
let listener = null;
ipcRenderer.on('open-file', (_event, file) => {
  if (listener) listener(file);
  else pending = file;
});

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  onOpenFile: (callback) => {
    listener = callback;
    if (pending) {
      const file = pending;
      pending = null;
      callback(file);
    }
  },
});
