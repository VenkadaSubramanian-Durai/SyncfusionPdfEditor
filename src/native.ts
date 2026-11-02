import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { inTauri, isMacOs } from './platform';

/** A file handed over by the operating system. */
export interface OpenedFile {
  name: string;
  base64: string;
}

/** Capabilities reported by the native print plugin. */
export interface NativeFeatures {
  print: boolean;
}

const NATIVE_PRINT_PLUGIN = 'native-print';

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(`plugin:${NATIVE_PRINT_PLUGIN}|${command}`, args);
}

export async function takeStartupFile(): Promise<OpenedFile | null> {
  if (!inTauri) {
    return null;
  }

  return invoke<OpenedFile | null>('take_startup_file');
}

export function onOpenFile(handler: (file: OpenedFile) => void): () => void {
  if (!inTauri) {
    return () => undefined;
  }

  let dispose: () => void = () => undefined;
  let cancelled = false;

  void listen<OpenedFile>('open-file', (event) => {
    handler(event.payload);
  }).then((unlisten) => {
    if (cancelled) {
      unlisten();
    } else {
      dispose = unlisten;
    }
  });

  return () => {
    cancelled = true;
    dispose();
  };
}

export async function getNativeFeatures(): Promise<NativeFeatures> {
  // The native print plugin is only registered on macOS.
  if (!inTauri || !isMacOs()) {
    return { print: false };
  }

  try {
    return await call<NativeFeatures>('features');
  } catch {
    return { print: false };
  }
}

export async function isNativePrintSupported(): Promise<boolean> {
  if (!inTauri || !isMacOs()) {
    return false;
  }

  try {
    return await call<boolean>('is_supported');
  } catch {
    return false;
  }
}

export async function printPdf(name: string, data: string): Promise<boolean> {
  return call<boolean>('print_pdf', { name, data });
}

/**
 * Saves the given bytes through the platform's own save flow.
 *
 * Every platform shows the Tauri save dialog (which uses the system file
 * picker on mobile as well) and writes the file with the fs plugin.
 */
export async function saveFile(name: string, base64: string): Promise<string | null> {
  if (!inTauri) {
    return null;
  }

  const path = await save({
    defaultPath: name,
    filters: [{ name, extensions: [name.split('.').pop() ?? 'pdf'] }]
  });

  if (!path) {
    return null;
  }

  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  await writeFile(path, bytes);

  return path;
}
