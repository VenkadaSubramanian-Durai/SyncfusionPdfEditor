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
 * Saves a file the user names and places. Returns false when the user cancels.
 * - Windows, macOS, Linux, Android: Save As dialog (dialog plugin), then write (fs plugin).
 * - iOS: the "Save to Files" sheet (native-print plugin). The dialog plugin's Save As
 *   on iOS only returns a location the app can't write to afterwards.
 */
export async function saveFile(
  data: Blob | Uint8Array,
  fileName: string,
  filter: { name: string; extensions: string[] },
): Promise<boolean> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer());
  if ((await nativeFeatures).saveFile) {
    return invoke<boolean>('plugin:native-print|save_file', bytes, {
      headers: { 'x-file-name': encodeURIComponent(fileName) },
    });
  }
  const path = await save({ defaultPath: fileName, filters: [filter] });
  if (!path) return false;
  await writeFile(path, bytes);
  return true;
}

/** Saves the edited PDF (see saveFile). */
export async function savePdf(blob: Blob, fileName: string): Promise<boolean> {
  const name = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  return saveFile(blob, name, { name: 'PDF document', extensions: ['pdf'] });
}

// ---- Printing ----
// The PDF Viewer prints with window.print(). Windows (WebView2) and Linux (WebKitGTK)
// show a print screen for that; the WebViews on macOS, iOS and Android do not.
// On those platforms the edited PDF goes to the native-print plugin instead, which
// opens the operating system's own print screen.

interface NativeFeatures {
  print: boolean;
  saveFile: boolean;
}
let nativePrint = false;
const nativeFeatures: Promise<NativeFeatures> = inTauri
  ? invoke<NativeFeatures>('plugin:native-print|features').catch((error) => {
      console.error('[native] Could not check native printing', error);
      return { print: false, saveFile: false };
    })
  : Promise.resolve({ print: false, saveFile: false });
void nativeFeatures.then((f) => (nativePrint = f.print));

/** True when Print must go through the operating system (macOS, iOS, Android). */
export function usesNativePrint(): boolean {
  return nativePrint;
}

/**
 * Opens the native print screen for the PDF. Resolves true when it was printed
 * (on Android: when the print screen was opened), false when the user cancelled.
 */
export async function printPdf(blob: Blob, fileName: string): Promise<boolean> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return invoke<boolean>('plugin:native-print|print_pdf', bytes, {
    headers: { 'x-file-name': encodeURIComponent(fileName || 'document.pdf') },
  });
}
