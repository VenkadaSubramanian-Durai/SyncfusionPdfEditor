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

export interface ViewerHandle {
  isAnnotationToolbarVisible: boolean;
  isFormDesignerToolbarVisible: boolean;
  isRedactionToolbarVisible: boolean;
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
  pageOrganizer: {
    openPageOrganizer(): void;
    closePageOrganizer(): void;
    isOrganizeWindowOpen: boolean;
  };
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

/** Closes the page organizer and the comments panel. */
export function closeOverlays(viewer: Viewer | null): void {
  if (!viewer) {
    return;
  }

  if (viewer.pageOrganizer?.isOrganizeWindowOpen) {
    viewer.pageOrganizer.closePageOrganizer();
  }

  viewer.viewerBase?.navigationPane?.closeCommentPanelContainer();
}

/** Closes every feature toolbar. Used by the "View" rail item. */
export function closeFeatureToolbars(viewer: Viewer | null): void {
  if (!viewer) {
    return;
  }

  viewer.toolbar.showAnnotationToolbar(false);
  viewer.toolbar.showRedactionToolbar(false);

  const modules = viewer.toolbarModule;

  const annotation = modules?.annotationToolbarModule;
  if (annotation && viewer.isAnnotationToolbarVisible) {
    // The toggle only hides the toolbar when its own flag allows it, so the
    // element is hidden directly here as well.
    annotation.toolbarElement.style.display = 'none';
    annotation.isToolbarHidden = false;
    viewer.isAnnotationToolbarVisible = false;
  }

  const redaction = modules?.redactionToolbarModule;
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
      if (formDesigner) {
        formDesigner.isToolbarHidden = true;
        formDesigner.showFormDesignerToolbar(null, false);
      }
      break;
    }
    case 'view':
      break;
  }
}

/** Opens the page organizer dialog. */
export function openOrganizer(viewer: Viewer | null): void {
  viewer?.pageOrganizer.openPageOrganizer();
}

export function closeOrganizer(viewer: Viewer | null): void {
  if (viewer?.pageOrganizer?.isOrganizeWindowOpen) {
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
