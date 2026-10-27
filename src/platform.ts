import { Capacitor } from '@capacitor/core';

/** Bridge exposed by electron/preload.cjs (desktop only). */
export interface DesktopBridge {
  readonly platform: string;
  /** Called when the OS asks the app to open a PDF (double-click, "Open with"). */
  onOpenFile(callback: (file: { name: string; base64: string }) => void): void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export type AppPlatform = 'web' | 'desktop' | 'android' | 'ios';

export function getPlatform(): AppPlatform {
  if (window.desktop) return 'desktop';
  const native = Capacitor.getPlatform();
  if (native === 'android' || native === 'ios') return native;
  return 'web';
}

export const platformLabel: Record<AppPlatform, string> = {
  web: 'Web',
  desktop: 'Desktop',
  android: 'Android',
  ios: 'iOS',
};

/**
 * Absolute URL of the bundled PDFium engine. Built from document.baseURI so it
 * resolves correctly on http(s)://, app:// (Electron) and capacitor:// (iOS).
 */
export const viewerResourceUrl = new URL('ej2-pdfviewer-lib', document.baseURI).href;
export const sampleDocumentUrl = new URL('sample.pdf', document.baseURI).href;
