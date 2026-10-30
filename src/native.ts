// Bridge to the Tauri shell. Every function is a no-op in a normal browser,
// so the same build also runs as a plain web app.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { inTauri } from './platform';

export interface OpenedFile {
  name: string;
  base64: string;
}

/** PDF the app was launched with (double-click / "Open with" on Windows and Linux). */
export async function takeStartupFile(): Promise<OpenedFile | null> {
  if (!inTauri) return null;
  try {
    return await invoke<OpenedFile | null>('take_startup_file');
  } catch (error) {
    console.error('[native] Could not read the startup file', error);
    return null;
  }
}

/** PDFs the OS hands over while the app is running (macOS / iOS "Open with"). */
export function onOpenFile(callback: (file: OpenedFile) => void): () => void {
  if (!inTauri) return () => {};
  const stop = listen<OpenedFile>('open-file', (event) => callback(event.payload));
  return () => {
    void stop.then((unlisten) => unlisten());
  };
}

/**
 * Shows the native Save As dialog and writes the edited PDF to the chosen
 * location. Returns false when the user cancels.
 */
export async function savePdf(blob: Blob, fileName: string): Promise<boolean> {
  const defaultPath = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const path = await save({
    defaultPath,
    filters: [{ name: 'PDF document', extensions: ['pdf'] }],
  });
  if (!path) return false;
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return true;
}
