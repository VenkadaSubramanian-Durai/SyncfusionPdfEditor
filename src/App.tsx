import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Annotation,
  BookmarkView,
  FormDesigner,
  FormFields,
  Inject,
  LinkAnnotation,
  Magnification,
  Navigation,
  PageOrganizer,
  PdfViewerComponent,
  Print,
  TextSearch,
  TextSelection,
  ThumbnailView,
  Toolbar,
  type DownloadStartEventArgs,
  type ExportStartEventArgs,
  type ExportSuccessEventArgs,
  type ExportFailureEventArgs,
  type PrintStartEventArgs,
  type ToolbarItem,
} from '@syncfusion/ej2-react-pdfviewer';
import { getPlatform, inTauri, sampleDocumentUrl, viewerResourceUrl } from './platform';
import { onOpenFile, printPdf, saveFile, savePdf, takeStartupFile, usesNativePrint } from './native';
import {
  applyMode,
  currentMode,
  closeOverlays,
  hideToolbarItems,
  thumbnailsOpen,
  openOrganizer,
  type ToolbarItemList,
  toggleThumbnails,
  type EditMode,
} from './viewer-modes';
import { TopBar } from './ui/TopBar';
import { Rail, type RailItem } from './ui/Rail';
import { StartScreen, type StartTask } from './ui/StartScreen';
import { CompareView, type DocFile } from './ui/CompareView';
import { Icon } from './ui/icons';

// The viewer's main toolbar is shown. Every item stays configured (the feature toolbars
// depend on them), and the ones our own UI already provides are hidden after load.
const toolbarItems: ToolbarItem[] = [
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
  'DownloadOption',
];
// Covered by our left rail (Annotate, Fill & Sign, Redact, Organize) and our Export button.
const hiddenToolbarItems: ToolbarItem[] = [
  'AnnotationEditTool',
  'FormDesignerEditTool',
  'RedactionEditTool',
  'OrganizePagesTool',
  'DownloadOption',
];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
const fetchBase64 = async (url: string) => arrayBufferToBase64(await (await fetch(url)).arrayBuffer());
const fileBase64 = async (f: File) => arrayBufferToBase64(await f.arrayBuffer());

/** Export data from the viewer may be bytes, a data: URL / base64 string, or plain text. */
function exportBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data === 'string') {
    const base64 = data.includes('base64,') ? data.split('base64,')[1] : null;
    if (base64) return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return new TextEncoder().encode(data);
  }
  return new TextEncoder().encode(JSON.stringify(data ?? {}));
}
const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'document';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

type Screen = 'start' | 'editor' | 'compare';

export default function App() {
  const viewer = useRef<PdfViewerComponent>(null);
  const phone = useMedia('(max-width: 640px)');
  const dark = useMedia('(prefers-color-scheme: dark)');

  const [screen, setScreen] = useState<Screen>('start');
  const [doc, setDoc] = useState<DocFile | null>(null);
  const [mode, setMode] = useState<EditMode>('view');
  // Task chosen on the start screen; applied once the document has loaded.
  const pendingTask = useRef<StartTask | null>(null);
  // True while our own export call runs, so its events don't loop back into the handlers.
  const exportingNatively = useRef(false);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  // Organize Pages is open (phones hide the bottom tabs so the dialog gets the full height).
  const [organizing, setOrganizing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saveState, setSaveState] = useState('Saved on this device');
  const [toast, setToast] = useState('');

  // Syncfusion theme dark mode follows the system setting.
  useEffect(() => {
    document.body.classList.toggle('e-dark-mode', dark);
  }, [dark]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- open documents ----
  const openDoc = useCallback((file: DocFile, task: StartTask = 'view') => {
    setDoc(file);
    pendingTask.current = task;
    setMode('view');
    setScreen('editor');
  }, []);

  useEffect(() => {
    // Desktop (Tauri): a PDF the app was launched with, or one opened later from the OS.
    const stop = onOpenFile((f) => openDoc(f));
    takeStartupFile().then((f) => {
      if (f) openDoc(f);
    });
    return stop;
  }, [openDoc]);

  const openSample = async (task: StartTask) => {
    try {
      if (task === 'compare') {
        startCompare();
        return;
      }
      const base64 = await fetchBase64(sampleDocumentUrl);
      openDoc({ name: 'sample.pdf', base64 }, task);
    } catch (e) {
      console.error('[sample] Could not load sample.pdf', e);
      setToast('Could not load the sample PDF');
    }
  };

  // Compare opens its own two-document picker; close the editor's panels first.
  const startCompare = () => {
    if (viewer.current) closeOverlays(viewer.current, true);
    setMoreOpen(false);
    setScreen('compare');
  };
  const loadSamplePair = async (): Promise<[DocFile, DocFile]> => [
    { name: 'sample.pdf', base64: await fetchBase64(sampleDocumentUrl) },
    { name: 'sample-v2.pdf', base64: await fetchBase64(new URL('sample-v2.pdf', document.baseURI).href) },
  ];

  // ---- viewer events ----
  const onDocumentLoad = () => {
    const v = viewer.current;
    if (!v) return;
    hideToolbarItems(v, hiddenToolbarItems as ToolbarItemList);
    setSaveState('Saved on this device');
    const task = pendingTask.current;
    pendingTask.current = null;
    if (task === 'annotate' || task === 'sign' || task === 'redact') changeMode(task);
    if (task === 'organize') setTimeout(() => showOrganizer(v), 300);
  };

  // Keep the rail in sync when the user closes a feature toolbar with the viewer's own X.
  const syncFromViewer = () => {
    setTimeout(() => {
      const v = viewer.current;
      if (!v) return;
      setMode(currentMode(v));
      setThumbsOpen(thumbnailsOpen(v));
    }, 150);
  };

  const onDownloadStart = (args: DownloadStartEventArgs) => {
    if (!inTauri || !viewer.current) return;
    args.cancel = true;
    const v = viewer.current;
    const name = v.downloadFileName || args.fileName || 'document.pdf';
    v.saveAsBlob()
      .then((blob) => savePdf(blob, name))
      .then((saved) => {
        if (saved) {
          setSaveState('Copy saved · original unchanged');
          setToast(`Saved ${name}`);
        }
      })
      .catch((e: unknown) => {
        console.error('[save] Could not save the PDF', e);
        setToast('Could not save the PDF');
      });
  };

  // macOS, iOS and Android: window.print() shows nothing there, so the edited PDF
  // (annotations, form data and page changes included) goes to the OS print screen.
  // Windows, Linux and the web keep the viewer's own print.
  const onPrintStart = (args: PrintStartEventArgs) => {
    if (!usesNativePrint() || !viewer.current) return;
    args.cancel = true;
    const v = viewer.current;
    const name = v.downloadFileName || args.fileName || 'document.pdf';
    setToast('Opening the print screen…');
    v.saveAsBlob()
      .then((blob) => printPdf(blob, name))
      .then((printed) => setToast(printed ? `Sent ${name} to print` : 'Printing cancelled'))
      .catch((e: unknown) => {
        console.error('[print] Could not print the PDF', e);
        setToast(`Could not print: ${e instanceof Error ? e.message : String(e)}`);
      });
  };

  // Export annotations (comment panel menu). The viewer saves the file with a browser
  // download link, which the app WebViews ignore (iOS does nothing). In the app we
  // take the data and save it with the native Save As / "Save to Files" sheet instead.
  const onExportStart = (args: ExportStartEventArgs) => {
    if (!inTauri || exportingNatively.current || !viewer.current) return;
    args.cancel = true;
    const v = viewer.current;
    const format: 'Json' | 'Xfdf' = args.exportData?.annotationDataFormat === 'Xfdf' ? 'Xfdf' : 'Json';
    const ext = format === 'Xfdf' ? 'xfdf' : 'json';
    const name = `${baseName(doc?.name ?? 'document')}.${ext}`;
    console.info(`[export] 1/3 reading annotations as ${format}`);
    setToast('Preparing annotations…');
    exportingNatively.current = true;
    // Guard: the viewer never resolves when there is nothing to export.
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000));
    Promise.race([Promise.resolve(v.exportAnnotationsAsBase64String(format as never)), timeout])
      .then((data: unknown) => {
        exportingNatively.current = false;
        if (!data) throw new Error('the viewer returned no annotation data');
        const bytes = exportBytes(data);
        console.info(`[export] 2/3 got ${bytes.length} bytes; opening the save screen for ${name}`);
        setToast('Choose where to save the annotations');
        return saveFile(bytes, name, {
          name: format === 'Xfdf' ? 'XFDF annotations' : 'JSON annotations',
          extensions: [ext],
        });
      })
      .then((saved) => {
        console.info(`[export] 3/3 ${saved ? 'saved' : 'cancelled'}`);
        setToast(saved ? `Annotations exported to ${name}` : 'Export cancelled');
      })
      .catch((e: unknown) => {
        exportingNatively.current = false;
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[export] failed:', msg);
        setToast(`Could not export annotations: ${msg}`);
      });
  };

  // Web: the viewer downloads the file itself; confirm it with a message.
  const onExportSuccess = (args: ExportSuccessEventArgs) => {
    if (inTauri) return; // the app shows its own message once the file is saved
    setToast(`Annotations exported${args.fileName ? ` (${args.fileName})` : ''}`);
  };
  const onExportFailed = (args: ExportFailureEventArgs) => {
    setToast(`Could not export annotations${args.errorDetails ? `: ${args.errorDetails}` : ''}`);
  };

  // ---- actions from our UI ----
  const showOrganizer = (v: PdfViewerComponent) => {
    setOrganizing(true);
    // Open after React has hidden the bottom tabs, so the dialog sizes to the full height.
    setTimeout(() => openOrganizer(v, () => setOrganizing(false)), 50);
  };

  const changeMode = (m: EditMode) => {
    const v = viewer.current;
    if (!v) return;
    applyMode(v, m);
    setMode(m);
  };

  const onRail = (item: RailItem) => {
    const v = viewer.current;
    setMoreOpen(item === 'more' ? !moreOpen : false);
    if (item === 'more') return;
    if (item === 'compare') {
      startCompare();
      return;
    }
    if (!v) return;
    // Organize Pages is a full-screen dialog; close it before any other feature.
    closeOverlays(v);
    if (item === 'organize') {
      showOrganizer(v);
      return;
    }
    if (item === 'pages') {
      const open = !thumbnailsOpen(v);
      toggleThumbnails(v, open);
      setThumbsOpen(open);
      return;
    }
    changeMode(item === mode && item !== 'view' ? 'view' : item);
  };

  const v = () => viewer.current;
  const railOn = (item: RailItem) =>
    item === 'pages' ? thumbsOpen : item === 'more' ? moreOpen : item === mode && screen === 'editor';

  // ---- render ----
  const start = (
    <StartScreen
      continueWith={doc?.name}
      onContinue={() => setScreen('editor')}
      onSample={openSample}
      onOpenFile={async (f, task) => openDoc({ name: f.name, base64: await fileBase64(f) }, task)}
    />
  );

  // No document yet: only the start screen (or Compare, which picks its own files).
  if (!doc) {
    return (
      <div className="app">
        {screen === 'compare' ? (
          <CompareView
            openDocument={null}
            resourceUrl={viewerResourceUrl}
            loadSamplePair={loadSamplePair}
            onClose={() => setScreen('start')}
          />
        ) : (
          start
        )}
      </div>
    );
  }

  // A document is open: the editor stays mounted (edits are kept) and the start
  // screen and Compare open on top of it.
  return (
    <div className={`app editor${phone ? ' phone' : ''}${organizing ? ' organizing' : ''}`}>
      <TopBar
        fileName={doc?.name ?? ''}
        saveState={saveState}
        compact={phone}
        onHome={() => setScreen('start')}
        onExport={() => v()?.download()}
      />

      <div className="workspace">
        {!phone && <Rail phone={false} isOn={railOn} onSelect={onRail} />}
        <main className="viewer-host" onClickCapture={syncFromViewer}>
          {
            <PdfViewerComponent
              ref={viewer}
              id="pdf-viewer"
              resourceUrl={viewerResourceUrl}
              documentPath={doc.base64}
              downloadFileName={doc.name}
              exportAnnotationFileName={baseName(doc.name)}
              toolbarSettings={{ showTooltip: true, toolbarItems }}
              enablePageOrganizer={true}
              enableFormDesigner={true}
              enableNavigationToolbar={false}
              enableDesktopMode={true}
              documentLoad={onDocumentLoad}
              annotationAdd={() => setSaveState('Edited · not saved yet')}
              formFieldAdd={() => setSaveState('Edited · not saved yet')}
              downloadStart={onDownloadStart}
              printStart={onPrintStart}
              exportStart={onExportStart}
              exportSuccess={onExportSuccess}
              exportFailed={onExportFailed}
              style={{ height: '100%', display: 'block' }}
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
                  PageOrganizer,
                ]}
              />
            </PdfViewerComponent>
          }
        </main>
      </div>

      {phone && !organizing && <Rail phone={true} isOn={railOn} onSelect={onRail} />}

      {phone && moreOpen && <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />}
      {phone && moreOpen && (
        <div className="more-sheet" role="menu">
          <button className="btn" onClick={() => onRail('redact')}>
            <Icon name="redact" />
            Redact
          </button>
          <button className="btn" onClick={() => onRail('compare')}>
            <Icon name="compare" />
            Compare
          </button>
          <button className="btn" onClick={() => onRail('pages')}>
            <Icon name="pages" />
            Thumbnails
          </button>
          <button
            className="btn"
            onClick={() => {
              setMoreOpen(false);
              v()?.print.print();
            }}
          >
            <Icon name="print" />
            Print
          </button>
        </div>
      )}

      {screen === 'compare' && (
        <CompareView
          openDocument={doc}
          resourceUrl={viewerResourceUrl}
          loadSamplePair={loadSamplePair}
          onClose={() => setScreen('editor')}
        />
      )}

      {screen === 'start' && <div className="start-overlay">{start}</div>}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
