import type { PdfViewerComponent } from '@syncfusion/ej2-react-pdfviewer';

/** The feature toolbar that is currently open. Only one at a time. */
export type EditMode = 'view' | 'annotate' | 'sign' | 'redact';

/** Toolbar item names accepted by `toolbar.showToolbarItem`. */
export type ToolbarItemList = string[];

interface FormDesignerToolbarModule {
  showFormDesignerToolbar(element?: HTMLElement | null, isInitialLoading?: boolean): void;
  resetFormDesignerToolbar(): void;
  isToolbarHidden: boolean;
  toolbarElement: HTMLElement;
}

interface AnnotationToolbarModule {
  showAnnotationToolbar(element?: HTMLElement | null, isInitialLoading?: boolean, isShow?: boolean): void;
  isToolbarHidden: boolean;
  toolbarElement: HTMLElement;
}

interface RedactionToolbarModule {
  showRedactionToolbar(element?: HTMLElement | null, isInitialLoading?: boolean, isShow?: boolean): void;
  isToolbarHidden: boolean;
  toolbarElement: HTMLElement;
}

/** The parts of the page organizer that the app reads. */
interface PageOrganizerModule {
  openPageOrganizer(): void;
  closePageOrganizer(): void;
  isOrganizeWindowOpen: boolean;
}

export interface ViewerHandle {
  isAnnotationToolbarVisible: boolean;
  isFormDesignerToolbarVisible: boolean;
  isRedactionToolbarVisible: boolean;
  /** Tells the viewer to show or hide the organizer dialog. */
  isPageOrganizerOpen: boolean;
  toolbar: {
    showAnnotationToolbar(visible: boolean): void;
    showRedactionToolbar(visible: boolean): void;
    showToolbarItem(items: ToolbarItemList, isVisible: boolean): void;
  };
  toolbarModule: {
    formDesignerToolbarModule: FormDesignerToolbarModule;
    annotationToolbarModule: AnnotationToolbarModule;
    redactionToolbarModule: RedactionToolbarModule;
  };
  annotationModule: {
    showCommentsPanel(): void;
  };
  pageOrganizer: PageOrganizerModule;
  viewerBase: {
    navigationPane: {
      openThumbnailPane(): void;
      closeThumbnailPane(): void;
      isThumbnailOpen: boolean;
      closeCommentPanelContainer(): void;
    };
  };
}

type Viewer = PdfViewerComponent & ViewerHandle;

const TOOLBAR_ITEMS_TO_HIDE: ToolbarItemList = [
  'AnnotationEditTool',
  'FormDesignerEditTool',
  'RedactionEditTool',
  'OrganizePagesTool',
  'DownloadOption'
];

/** Hides the toolbar entries that the app drives from its own rail. */
export function hideAppControlledToolbarItems(viewer: Viewer | null): void {
  viewer?.toolbar.showToolbarItem(TOOLBAR_ITEMS_TO_HIDE, false);
}

/** Closes the comments panel. */
export function closeCommentsPanel(viewer: Viewer | null): void {
  viewer?.viewerBase?.navigationPane?.closeCommentPanelContainer();
}

/** Closes the page organizer and the comments panel. */
export function closeOverlays(viewer: Viewer | null): void {
  if (!viewer) {
    return;
  }

  /*
   * The flag is cleared first. The viewer opens the organizer by itself when
   * the last preview image arrives, so an open request that is still waiting
   * for those images has to be cancelled here. Without it the organizer would
   * appear later, after the user had already moved on to another tool.
   */
  viewer.isPageOrganizerOpen = false;

  if (viewer.pageOrganizer?.isOrganizeWindowOpen) {
    viewer.pageOrganizer.closePageOrganizer();
  }

  closeCommentsPanel(viewer);
}

/** Closes every feature toolbar. Used by the "View" rail item. */
export function closeFeatureToolbars(viewer: Viewer | null): void {
  if (!viewer) {
    return;
  }

  const modules = viewer.toolbarModule;

  /*
   * On mobile the viewer builds the feature toolbars only when they are
   * opened, so their element can be missing. The public toggle reads that
   * element directly and would fail when it is absent.
   */
  const annotation = modules?.annotationToolbarModule;
  if (annotation?.toolbarElement) {
    viewer.toolbar.showAnnotationToolbar(false);
  }

  const redaction = modules?.redactionToolbarModule;
  if (redaction?.toolbarElement) {
    viewer.toolbar.showRedactionToolbar(false);
  }

  if (annotation && viewer.isAnnotationToolbarVisible) {
    // The toggle only hides the toolbar when its own flag allows it, so the
    // element is hidden directly here as well.
    annotation.toolbarElement.style.display = 'none';
    annotation.isToolbarHidden = false;
    viewer.isAnnotationToolbarVisible = false;
  }

  if (redaction && viewer.isRedactionToolbarVisible) {
    redaction.toolbarElement.style.display = 'none';
    redaction.isToolbarHidden = false;
    viewer.isRedactionToolbarVisible = false;
  }

  const formDesigner = modules?.formDesignerToolbarModule;
  if (formDesigner && viewer.isFormDesignerToolbarVisible) {
    formDesigner.toolbarElement.style.display = 'none';
    formDesigner.isToolbarHidden = true;
    viewer.isFormDesignerToolbarVisible = false;
  }

  hideEmptyMobileToolbars(viewer);
}

/**
 * On mobile the viewer destroys the content of a feature toolbar but leaves
 * the empty container behind, which still takes up space above the document.
 * Those containers are hidden here.
 */
function hideEmptyMobileToolbars(viewer: Viewer): void {
  const element = (viewer as unknown as { element?: { id?: string } }).element;

  if (!element?.id) {
    return;
  }

  const ids = [
    `${element.id}_mobileAnnotationToolbar`,
    `${element.id}_mobileRedactionToolbar`
  ];

  for (const id of ids) {
    const container = document.getElementById(id);

    if (container && container.children.length === 0) {
      container.style.display = 'none';
    }
  }
}

/**
 * Opens the toolbar that matches the mode and closes the others (N2).
 * The "view" mode closes every feature toolbar.
 */
export function applyMode(viewer: Viewer | null, mode: EditMode): void {
  if (!viewer) {
    return;
  }

  closeFeatureToolbars(viewer);

  switch (mode) {
    case 'annotate':
      viewer.toolbar.showAnnotationToolbar(true);
      break;
    case 'redact':
      viewer.toolbar.showRedactionToolbar(true);
      break;
    case 'sign': {
      const formDesigner = viewer.toolbarModule?.formDesignerToolbarModule;
      // The form designer toolbar is not created on mobile, so there is
      // nothing to open there.
      if (formDesigner?.toolbarElement) {
        formDesigner.isToolbarHidden = true;
        formDesigner.showFormDesignerToolbar(null, false);
      }
      break;
    }
    case 'view':
      break;
  }
}

/**
 * Opens the page organizer dialog.
 *
 * The organizer shows a preview image of every page, so the viewer can only
 * open it once all of those images have arrived. When they are still on their
 * way, the request is remembered by the viewer and the dialog appears as soon
 * as the last image comes in.
 */
export function openOrganizer(viewer: Viewer | null): void {
  if (!viewer) {
    return;
  }

  // The viewer opens the organizer by itself when the images arrive.
  viewer.isPageOrganizerOpen = true;

  // This covers the case where the images are already there.
  viewer.pageOrganizer.openPageOrganizer();
}

export function closeOrganizer(viewer: Viewer | null): void {
  if (!viewer) {
    return;
  }

  viewer.isPageOrganizerOpen = false;

  if (viewer.pageOrganizer?.isOrganizeWindowOpen) {
    viewer.pageOrganizer.closePageOrganizer();
  }
}
/** Toggles the thumbnail pane and reports the state the viewer ended up in. */
export function toggleThumbnails(viewer: Viewer | null): boolean {
  if (!viewer) {
    return false;
  }

  const pane = viewer.viewerBase?.navigationPane;
  if (!pane) {
    return false;
  }

  if (pane.isThumbnailOpen) {
    pane.closeThumbnailPane();
    return false;
  }

  pane.openThumbnailPane();
  return true;
}

/** Reads the toolbar state back from the viewer, used to keep the rail in sync (N3). */
export function currentMode(viewer: Viewer | null): EditMode {
  if (!viewer) {
    return 'view';
  }

  if (viewer.isAnnotationToolbarVisible) {
    return 'annotate';
  }

  if (viewer.isRedactionToolbarVisible) {
    return 'redact';
  }

  if (viewer.isFormDesignerToolbarVisible) {
    return 'sign';
  }

  return 'view';
}
