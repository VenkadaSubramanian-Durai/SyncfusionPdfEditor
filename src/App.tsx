import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Annotation,
  BookmarkView,
  DownloadStartEventArgs,
  ExportFailureEventArgs,
  ExportStartEventArgs,
  ExportSuccessEventArgs,
  FormDesigner,
  FormFields,
  Inject,
  LinkAnnotation,
  LoadEventArgs,
  Magnification,
  Navigation,
  PageOrganizer,
  PdfViewerComponent,
  Print,
  PrintStartEventArgs,
  TextSearch,
  TextSelection,
  Toolbar,
  ThumbnailView,
  type ToolbarItem
} from '@syncfusion/ej2-react-pdfviewer';
import { inTauri, isPhone, sampleDocumentUrl, viewerResourceUrl } from './platform';
import { getNativeFeatures, onOpenFile, printPdf, saveFile, takeStartupFile } from './native';
import {
  applyMode,
  closeFeatureToolbars,
  closeOverlays,
  currentMode,
  hideAppControlledToolbarItems,
  openOrganizer,
  toggleThumbnails
} from './viewer-modes';
import type { EditMode } from './viewer-modes';
import { CompareView, type DocFile } from './ui/CompareView';
import { Rail, type RailItem } from './ui/Rail';
import { StartScreen, type StartTask } from './ui/StartScreen';
import { TopBar } from './ui/TopBar';

type Screen = 'start' | 'editor' | 'compare';

const TOOLBAR_ITEMS: ToolbarItem[] = [
  'OpenOption',
  'UndoRedoTool',
  'PageNavigationTool',
  'MagnificationTool',
  'PanTool',
  'SelectionTool',
  'CommentTool',
  'SearchOption',
  'AnnotationEditTool',
  'FormDesignerEditTool',
  'RedactionEditTool',
  'OrganizePagesTool',
  'PrintOption',
  'DownloadOption'
];

function bytesToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function baseName(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchToDocFile(url: string, name: string): Promise<DocFile> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return { name, base64: bytesToBase64(buffer) };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [doc, setDoc] = useState<DocFile | null>(null);
  const [mode, setMode] = useState<EditMode>('view');
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [saveState, setSaveState] = useState('Saved on this device');
  const [toast, setToast] = useState('');
  const [phone, setPhone] = useState(isPhone());

  const viewerRef = useRef<PdfViewerComponent | null>(null);
  const pendingTask = useRef<StartTask | null>(null);
  const exportingNatively = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const nativePrint = useRef(false);
  const organizerWasOpen = useRef(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  /* ---------------------------------------------------------------- phone */

  useEffect(() => {
    const onResize = () => setPhone(isPhone());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* -------------------------------------------------------- native setup */

  useEffect(() => {
    if (!inTauri) {
      return;
    }

    void getNativeFeatures().then((features) => {
      nativePrint.current = features.print;
    });

    void takeStartupFile().then((file) => {
      if (file) {
        setDoc(file);
        setScreen('editor');
      }
    });

    return onOpenFile((file) => {
      setDoc(file);
      setScreen('editor');
    });
  }, []);

  /* ------------------------------------------------------------ helpers */

  const openDocument = useCallback((file: DocFile, task?: StartTask) => {
    pendingTask.current = task ?? null;
    setDoc(file);
    setMode('view');
    setThumbsOpen(false);
    setOrganizing(false);
    setSaveState('Saved on this device');
    setScreen('editor');
  }, []);

  const openFile = useCallback(
    async (file: File, task?: StartTask) => {
      try {
        const buffer = await file.arrayBuffer();
        openDocument({ name: file.name, base64: bytesToBase64(buffer) }, task);
      } catch {
        showToast('Could not read that file');
      }
    },
    [openDocument, showToast]
  );

  const openSample = useCallback(async () => {
    try {
      const sample = await fetchToDocFile(sampleDocumentUrl, 'sample.pdf');
      openDocument(sample);
    } catch {
      showToast('Could not load the sample');
    }
  }, [openDocument, showToast]);

  const goHome = useCallback(() => {
    closeOverlays(viewerRef.current);
    setOrganizing(false);
    setMode('view');
    setScreen('start');
  }, []);

  /* ------------------------------------------------------- viewer events */

  const onDocumentLoad = useCallback(
    (args: LoadEventArgs) => {
      hideAppControlledToolbarItems(viewerRef.current);

      // The viewer can open a document on its own through the Open button in
      // its toolbar. The app bar then has to show the name of that document.
      // A document that was loaded from a base64 string has no name, and the
      // viewer reports "undefined.pdf" for it, so that value is ignored.
      const loadedName = args.documentName;

      if (loadedName && loadedName !== 'undefined.pdf' && doc && loadedName !== doc.name) {
        setDoc((current) =>
          current && current.name !== loadedName ? { ...current, name: loadedName } : current
        );
        setSaveState('Saved on this device');
      }

      const task = pendingTask.current;
      pendingTask.current = null;

      if (task === 'organize') {
        /*
         * The organizer needs a preview image of every page. Those images are
         * requested while the document loads, so they are usually not ready
         * yet. The viewer opens the organizer by itself once the last image
         * arrives, which is why the request is set through the flag.
         */
        setOrganizing(true);
        openOrganizer(viewerRef.current);
        return;
      }

      if (task && task !== 'compare') {
        const next = task as EditMode;
        setMode(next);
        applyMode(viewerRef.current, next);
      }
    },
    [doc]
  );

  const onAnnotationAdd = useCallback(() => {
    setSaveState('Edited · not saved yet');
  }, []);

  const onFormFieldAdd = useCallback(() => {
    setSaveState('Edited · not saved yet');
  }, []);

  /* ----------------------------------------------------------- exporting */

  const exportPdf = useCallback(async () => {
    const viewer = viewerRef.current;
    if (!viewer || !doc) {
      return;
    }

    if (!inTauri) {
      viewer.download();
      return;
    }

    try {
      const blob = await viewer.saveAsBlob();
      const base64 = bytesToBase64(await blob.arrayBuffer());
      const saved = await saveFile(doc.name, base64);

      if (saved) {
        showToast(`Saved ${doc.name}`);
        setSaveState('Copy saved · original unchanged');
      }
    } catch {
      showToast('Could not save the PDF');
    }
  }, [doc, showToast]);

  const onDownloadStart = useCallback(
    (args: DownloadStartEventArgs) => {
      if (!inTauri) {
        return;
      }

      // Tauri cannot use the browser download, so the native save flow takes over.
      args.cancel = true;
      void exportPdf();
    },
    [exportPdf]
  );

  /* -------------------------------------------------------------- print */

  const onPrintStart = useCallback(
    (args: PrintStartEventArgs) => {
      const viewer = viewerRef.current;
      if (!viewer || !doc || !nativePrint.current) {
        return;
      }

      args.cancel = true;
      showToast('Opening the print screen…');

      void (async () => {
        try {
          const blob = await viewer.saveAsBlob();
          const base64 = bytesToBase64(await blob.arrayBuffer());
          const printed = await printPdf(doc.name, base64);

          if (printed) {
            showToast(`Sent ${doc.name} to print`);
          } else {
            showToast('Printing cancelled');
          }
        } catch (error) {
          showToast(`Could not print: ${reason(error)}`);
        }
      })();
    },
    [doc, showToast]
  );

  /* -------------------------------------------------- annotation export */

  const onExportStart = useCallback(
    (args: ExportStartEventArgs) => {
      if (!inTauri) {
        return;
      }

      // The nested export started by exportAnnotationsAsBase64String must not
      // be cancelled, otherwise its promise never resolves.
      if (exportingNatively.current) {
        return;
      }

      exportingNatively.current = true;
      args.cancel = true;
      showToast('Preparing annotations…');

      void (async () => {
        try {
          console.log('[export] 1/3');

          const viewer = viewerRef.current;
          if (!viewer) {
            throw new Error('the viewer returned no annotation data');
          }

          const json = await viewer.exportAnnotationsAsObject();

          if (!json) {
            throw new Error('No annotations returned');
          }

          const base64 = bytesToBase64(
            new TextEncoder().encode(String(json))
          );

          const saved = await saveFile(
            `${baseName(doc?.name ?? 'document')}.json`,
            base64
          );

          console.log('Saved:', saved);

          if (saved) {
            showToast('Annotations exported');
          } else {
            showToast('Export cancelled');
          }
          } catch (error) {
            console.log(`[export] failed: ${reason(error)}`);
            showToast(`Could not export annotations: ${reason(error)}`);
          } finally {
            exportingNatively.current = false;
          }
      })();
    },
    [doc, showToast]
  );

  const onExportSuccess = useCallback(
    (args: ExportSuccessEventArgs) => {
      if (!inTauri) {
        showToast(`Annotations exported (${args.fileName})`);
        return;
      }

      // In Tauri the native save flow owns the message, so the viewer's own
      // success event is ignored here.
    },
    [showToast]
  );

  const onExportFailed = useCallback(
    (args: ExportFailureEventArgs) => {
      if (exportingNatively.current) {
        return;
      }

      exportingNatively.current = false;
      showToast(`Could not export annotations: ${args.errorDetails}`);
    },
    [showToast]
  );

  /* --------------------------------------------------------------- rail */

  const onRailSelect = useCallback((item: RailItem) => {
    const viewer = viewerRef.current;

    if (item === 'compare') {
      closeOverlays(viewer);
      setOrganizing(false);
      setScreen('compare');
      return;
    }

    // N1: opening any rail item first closes the organizer.
    closeOverlays(viewer);

    /*
     * A pending "organize" task is replaced here. The landing-page tile sets
     * it before the viewer has loaded the document, so the user can pick
     * another tool while the file is still loading. The pending task would
     * otherwise re-open the organizer once `documentLoad` fires.
     */
    if (pendingTask.current === 'organize' && item !== 'organize') {
      pendingTask.current = null;
    }

    if (item === 'organize') {
      setMode('view');
      openOrganizer(viewer);
      setOrganizing(true);
      return;
    }

    // Any other tool replaces the organizer, so its highlight goes away.
    setOrganizing(false);

    if (item === 'pages') {
      setMode('view');
      setThumbsOpen(toggleThumbnails(viewer));
      return;
    }

    if (item === 'view') {
      setMode('view');
      closeFeatureToolbars(viewer);
      return;
    }

    const next = item as EditMode;

    // Selecting the active rail item again closes its toolbar (FR-ANNOT AC1).
    if (mode === next) {
      setMode('view');
      closeFeatureToolbars(viewer);
      return;
    }

    setMode(next);
    applyMode(viewer, next);
  }, [mode]);

  /* Keeps the rail in sync when the viewer closes its own toolbar (N3). */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const viewer = viewerRef.current;
      if (!viewer) {
        return;
      }

      const next = currentMode(viewer);
      setMode((current) => (current === next ? current : next));

      const thumbs = viewer.viewerBase?.navigationPane?.isThumbnailOpen ?? false;
      setThumbsOpen((current) => (current === thumbs ? current : thumbs));

      /*
       * The organizer can also be closed with its own ✕ button. The flag is
       * only cleared when the organizer was open and has closed since the
       * last check. A request that is still waiting for the preview images
       * keeps the highlight, because the organizer opens later on.
       */
      const organizerOpen = viewer.pageOrganizer?.isOrganizeWindowOpen ?? false;
      if (organizerWasOpen.current && !organizerOpen) {
        setOrganizing(false);
      }
      organizerWasOpen.current = organizerOpen;
    }, 150);

    return () => window.clearInterval(timer);
  }, []);

  /* ------------------------------------------------------------- render */

  // N4: Home and Compare never unmount the viewer while a document is open.
  const showStartOverlay = screen === 'start' && doc !== null;
  const showCompare = screen === 'compare';

  // The app bar belongs to the editor. It is hidden on the start screen and
  // while the start screen is shown as an overlay on top of the editor.
  const showTopBar = screen === 'editor' && doc !== null;

  // The rail highlights the feature that is currently open.
  const railActive: RailItem = organizing
    ? 'organize'
    : thumbsOpen
      ? 'pages'
      : mode === 'view'
        ? 'view'
        : mode;

  const onTask = (task: StartTask) => {
    if (task === 'compare') {
      setScreen('compare');
    }
  };

  return (
    <>
      {doc ? (
        <div className={`app editor${phone ? ' phone' : ''}${organizing ? ' organizing' : ''}`}>
          {showTopBar ? (
            <TopBar
              fileName={doc.name}
              saveState={saveState}
              onHome={goHome}
              onExport={() => void exportPdf()}
            />
          ) : null}

          <div className="workspace">
            {!phone ? (
              <Rail
                active={railActive}
                onSelect={onRailSelect}
                variant="desktop"
              />
            ) : null}

            <main className="viewer-host">
              <PdfViewerComponent
                id="pdf-viewer"
                ref={viewerRef}
                resourceUrl={viewerResourceUrl}
                documentPath={doc.base64}
                downloadFileName={doc.name}
                exportAnnotationFileName={baseName(doc.name)}
                toolbarSettings={{ toolbarItems: TOOLBAR_ITEMS }}
                enablePageOrganizer
                enableFormDesigner
                enableNavigationToolbar={false}
                enableThumbnail
                documentLoad={onDocumentLoad}
                annotationAdd={onAnnotationAdd}
                formFieldAdd={onFormFieldAdd}
                downloadStart={onDownloadStart}
                printStart={onPrintStart}
                exportStart={onExportStart}
                exportSuccess={onExportSuccess}
                exportFailed={onExportFailed}
                style={{ height: '100%', width: '100%' }}
              >
                <Inject
                  services={[
                    Toolbar,
                    Magnification,
                    Navigation,
                    LinkAnnotation,
                    BookmarkView,
                    ThumbnailView,
                    Print,
                    TextSelection,
                    TextSearch,
                    Annotation,
                    FormFields,
                    FormDesigner,
                    PageOrganizer
                  ]}
                />
              </PdfViewerComponent>
            </main>
          </div>

          {phone ? (
            <Rail
              active={railActive}
              onSelect={onRailSelect}
              variant="phone"
              hidden={organizing}
            />
          ) : null}
        </div>
      ) : null}

      {showStartOverlay ? (
        <div className="overlay start-overlay">
          <StartScreen
            continueWith={doc?.name}
            onOpenFile={(file, task) => void openFile(file, task)}
            onOpenSample={() => void openSample()}
            onContinue={() => setScreen('editor')}
            onTask={onTask}
          />
        </div>
      ) : null}

      {screen === 'start' && doc === null ? (
        <StartScreen
          onOpenFile={(file, task) => void openFile(file, task)}
          onOpenSample={() => void openSample()}
          onTask={onTask}
        />
      ) : null}

      {showCompare ? (
        <CompareView
          openDocument={doc}
          onClose={() => setScreen(doc ? 'editor' : 'start')}
          onToast={showToast}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}
