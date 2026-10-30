import { isTauri } from '@tauri-apps/api/core';

export type AppPlatform = 'web' | 'desktop' | 'android' | 'ios';

/** True when running inside the Tauri shell (desktop or mobile). */
export const inTauri = isTauri();

export function getPlatform(): AppPlatform {
  if (!inTauri) return 'web';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'desktop';
}

export const platformLabel: Record<AppPlatform, string> = {
  web: 'Web',
  desktop: 'Desktop',
  android: 'Android',
  ios: 'iOS',
};

/**
 * Absolute URL of the bundled PDFium engine. Built from document.baseURI so it
 * resolves on http(s):// (web and dev server), tauri://localhost (macOS, iOS,
 * Linux) and http://tauri.localhost (Windows, Android).
 */
export const viewerResourceUrl = new URL('ej2-pdfviewer-lib', document.baseURI).href;
export const sampleDocumentUrl = new URL('sample.pdf', document.baseURI).href;
