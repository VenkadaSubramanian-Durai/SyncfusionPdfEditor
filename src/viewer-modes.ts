// Thin wrappers around the Syncfusion PDF Viewer APIs that our own UI calls.
// The viewer's built-in main toolbar is hidden; its feature toolbars
// (annotation, form designer, redaction) are opened from our left rail.
import type { PdfViewerComponent } from '@syncfusion/ej2-react-pdfviewer';
import { Browser } from '@syncfusion/ej2-base';

export type EditMode = 'view' | 'annotate' | 'sign' | 'redact';

/* eslint-disable @typescript-eslint/no-explicit-any */
const tb = (v: PdfViewerComponent): any => (v as any).toolbarModule ?? (v as any).toolbar;

function annotationHidden(v: PdfViewerComponent): boolean {
  return tb(v)?.annotationToolbarModule?.isToolbarHidden ?? true;
}
function formDesignerHidden(v: PdfViewerComponent): boolean {
  return tb(v)?.formDesignerToolbarModule?.isToolbarHidden ?? true;
}
function redactionHidden(v: PdfViewerComponent): boolean {
  return tb(v)?.redactionToolbarModule?.isToolbarHidden ?? true;
}

export type ToolbarItemList = Parameters<PdfViewerComponent['toolbar']['showToolbarItem']>[0];

/** Hides main-toolbar items that our own UI already provides (rail and Export). */
export function hideToolbarItems(v: PdfViewerComponent, items: ToolbarItemList) {
  tb(v)?.showToolbarItem(items, false);
}

/** Opens exactly one feature toolbar (or none for 'view'). */
export function applyMode(v: PdfViewerComponent, mode: EditMode) {
  const t = tb(v);
  if (!t) return;
  if (mode !== 'annotate' && !annotationHidden(v)) t.showAnnotationToolbar(false);
  if (mode !== 'redact' && !redactionHidden(v)) t.showRedactionToolbar(false);
  if (mode !== 'sign' && !formDesignerHidden(v)) t.formDesignerToolbarModule.showFormDesignerToolbar(null, false);

  if (mode === 'annotate' && annotationHidden(v)) t.showAnnotationToolbar(true);
  if (mode === 'redact' && redactionHidden(v)) t.showRedactionToolbar(true);
  if (mode === 'sign' && formDesignerHidden(v)) t.formDesignerToolbarModule.showFormDesignerToolbar(null, false);
}

/** Reads which feature toolbar is open, so our rail follows the viewer's own close (X) button. */
export function currentMode(v: PdfViewerComponent): EditMode {
  if (!annotationHidden(v)) return 'annotate';
  if (!formDesignerHidden(v)) return 'sign';
  if (!redactionHidden(v)) return 'redact';
  return 'view';
}

export function toggleThumbnails(v: PdfViewerComponent, open: boolean) {
  const m = (v as any).thumbnailViewModule;
  if (!m) return;
  if (open) m.openThumbnailPane();
  else m.closeThumbnailPane();
}

/** Opens or closes the viewer's own comment panel. */
export function setComments(v: PdfViewerComponent, open: boolean) {
  if (open) (v as any).annotationModule?.showCommentsPanel();
  else (v as any).isCommandPanelOpen = false;
}

/** True while the viewer's thumbnail pane is open (also after the pane's own close button). */
export function thumbnailsOpen(v: PdfViewerComponent): boolean {
  return !!(v as any).viewerBase?.navigationPane?.isThumbnailOpen;
}

/** Closes Organize Pages (and optionally the comment panel) before switching to another feature. */
export function closeOverlays(v: PdfViewerComponent, alsoComments = false) {
  const org = organizer(v);
  if (org?.isOrganizeWindowOpen) org.closePageOrganizer();
  if (alsoComments && (v as any).isCommandPanelOpen) (v as any).isCommandPanelOpen = false;
}

const organizer = (v: PdfViewerComponent): any => (v as any).pageOrganizerModule ?? (v as any).pageOrganizer;

/**
 * Opens Organize Pages. On phones and tablets (iOS, Android) it uses the viewer's
 * own mobile layout: compact icon toolbar, "⋮" menu with Save / Save As, touch tiles.
 * The app keeps enableDesktopMode on for the editor toolbars, which would otherwise
 * squeeze the desktop organizer onto a small screen, so it is switched off only while
 * the organizer is open. `onClosed` runs when the user closes it.
 */
export function openOrganizer(v: PdfViewerComponent, onClosed?: () => void) {
  const org = organizer(v);
  if (!org) return;
  const mobile = Browser.isDevice && (v as any).enableDesktopMode;
  if (mobile) (v as any).setProperties({ enableDesktopMode: false }, true);
  org.openPageOrganizer();
  const watch = setInterval(() => {
    if (org.isOrganizeWindowOpen) return;
    clearInterval(watch);
    if (mobile) (v as any).setProperties({ enableDesktopMode: true }, true);
    onClosed?.();
  }, 300);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
