import { useEffect, useRef, useState } from 'react';
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
  type ToolbarItem,
} from '@syncfusion/ej2-react-pdfviewer';
import { getPlatform, platformLabel, sampleDocumentUrl, viewerResourceUrl } from './platform';
import { saveAndSharePdf } from './mobile-save';

const platform = getPlatform();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
const isMobileNative = platform === 'android' || platform === 'ios';

// One toolbar for every platform. On narrow screens the viewer switches to its
// built-in mobile toolbar automatically.
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

export default function App() {
  const viewer = useRef<PdfViewerComponent>(null);
  const openedFromOs = useRef(false);

  // The document is passed to the viewer as base64 (not a URL) so the same code
  // works on http(s):// (web), app:// (Electron) and capacitor:// (iOS).
  const [doc, setDoc] = useState<{ base64: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Desktop: open PDFs passed by the OS (double-click / "Open with").
    window.desktop?.onOpenFile(({ name, base64 }) => {
      openedFromOs.current = true;
      setDoc({ base64, name });
    });

    // Everyone else starts with the bundled sample.
    fetch(sampleDocumentUrl)
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        if (!cancelled && !openedFromOs.current) {
          setDoc({ base64: arrayBufferToBase64(buffer), name: 'sample.pdf' });
        }
      })
      .catch((error: unknown) => console.error('[sample] Could not load sample.pdf', error));

    return () => {
      cancelled = true;
    };
  }, []);

  // Mobile: blob downloads do not work inside a WebView, so save + share instead.
  const onDownloadStart = (args: DownloadStartEventArgs) => {
    if (!isMobileNative || !viewer.current) return;
    args.cancel = true;
    const name = viewer.current.downloadFileName || args.fileName || 'document.pdf';
    viewer.current
      .saveAsBlob()
      .then((blob) => saveAndSharePdf(blob, name))
      .catch((error: unknown) => console.error('[save] Could not save the PDF', error));
  };

  return (
    <div className="app">
      <header className="app-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">PDF Editor</span>
        </div>
        <span className="platform-chip" title="Same code on every platform">
          {platformLabel[platform]}
        </span>
        <span className="spacer" />
        <span className="powered">Powered by Syncfusion PDF Viewer</span>
      </header>

      <main className="viewer-host">
        {/* Rendered once the first document is ready, so the viewer never starts empty. */}
        {doc && (
          <PdfViewerComponent
            ref={viewer}
            id="pdf-viewer"
            resourceUrl={viewerResourceUrl}
            toolbarSettings={{ showTooltip: true, toolbarItems }}
            enablePageOrganizer={true}
            enableFormDesigner={true}
            documentPath={doc.base64}
            downloadFileName={doc.name}
            downloadStart={onDownloadStart}
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
        )}
      </main>
    </div>
  );
}
