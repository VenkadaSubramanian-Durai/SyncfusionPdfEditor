export type AppPlatform = 'web' | 'desktop' | 'android' | 'ios';

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

/** True when running inside a Tauri shell (desktop or mobile). */
export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

function detectPlatform(): AppPlatform {
  if (!inTauri) {
    return 'web';
  }

  if (/android/i.test(ua)) {
    return 'android';
  }

  // iPadOS reports a desktop Mac UA, so it is detected through the touch-capable
  // platform hints that Safari exposes instead.
  const isIpadOs =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

  if (isIpadOs) {
    return 'ios';
  }

  if (/iPhone|iPod/i.test(ua)) {
    return 'ios';
  }

  return 'desktop';
}

export const currentPlatform: AppPlatform = detectPlatform();

export function getPlatform(): AppPlatform {
  return currentPlatform;
}

/**
 * True on macOS.
 *
 * Only macOS needs the native print panel, because WKWebView has no
 * window.print. Every other platform prints through the WebView.
 */
export function isMacOs(): boolean {
  if (!inTauri) {
    return false;
  }

  return /mac/i.test(ua) || /mac/i.test(navigator.platform ?? '');
}

export function isPhone(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 640;
}

/**
 * Folder that holds pdfium.js and pdfium.wasm.
 *
 * The viewer loads these files from a web worker, so the URL has to be
 * absolute. It must not end with a slash, because the viewer appends
 * "/pdfium.js" to it.
 */
export const viewerResourceUrl = `${window.location.origin}/ej2-pdfviewer-lib`;

export const sampleDocumentUrl = '/sample.pdf';
export const sampleDocumentUrlV2 = '/sample-v2.pdf';

/* -------------------------------------------------------------------------
   Adaptive theming
   -------------------------------------------------------------------------
   The app follows the operating system colour scheme. The Syncfusion
   components read their colours from CSS variables that are defined twice:
   once for the light values on `:root` and once for the dark values on
   `.e-dark-mode`. Adding or removing that class on `<body>` therefore
   switches every Syncfusion component and the app tokens at the same time.
   ------------------------------------------------------------------------- */

const DARK_CLASS = 'e-dark-mode';

let colorSchemeQuery: MediaQueryList | null = null;
let colorSchemeListenerAttached = false;

/** Applies the given colour scheme to the document body. */
export function applyColorScheme(isDark: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.classList.toggle(DARK_CLASS, isDark);
}

/** Starts following the operating system colour scheme. */
export function watchColorScheme(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return;
  }

  colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  applyColorScheme(colorSchemeQuery.matches);

  if (!colorSchemeListenerAttached) {
    colorSchemeListenerAttached = true;

    const onChange = (event: MediaQueryListEvent) => {
      applyColorScheme(event.matches);
    };

    if (typeof colorSchemeQuery.addEventListener === 'function') {
      colorSchemeQuery.addEventListener('change', onChange);
    } else if (typeof colorSchemeQuery.addListener === 'function') {
      // Safari below version 14.
      colorSchemeQuery.addListener(onChange);
    }
  }
}

/** True when the dark colour scheme is currently applied. */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.body.classList.contains(DARK_CLASS);
}
