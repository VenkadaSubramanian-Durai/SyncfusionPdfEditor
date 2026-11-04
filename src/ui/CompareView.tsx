import { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonComponent, SwitchComponent, type ChangeEventArgs } from '@syncfusion/ej2-react-buttons';
import {
  Inject,
  Magnification,
  Navigation,
  PdfComparerComponent,
  TextSelection,
  type TextComparisonOptions
} from '@syncfusion/ej2-react-pdfviewer';
import { sampleDocumentUrl, sampleDocumentUrlV2, viewerResourceUrl } from '../platform';

/** The parts of the comparer that the app drives. */
interface ComparerHandle {
  enableSyncScrolling: boolean;
}

/** A document held in memory as base64. Used for every open document. */
export interface DocFile {
  name: string;
  base64: string;
}

export type CompareSlot = 'original' | 'modified';

interface CompareViewProps {
  /** The document currently open in the editor, if any. */
  openDocument: DocFile | null;
  onClose: () => void;
  onToast: (message: string) => void;
}

function baseName(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

async function fileToDocFile(file: File): Promise<DocFile> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return { name: file.name, base64: btoa(binary) };
}

async function fetchToDocFile(url: string, name: string): Promise<DocFile> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return { name, base64: btoa(binary) };
}

function Slot({
  slot,
  title,
  badge,
  file,
  onFile,
  onRemove,
  extraAction
}: {
  slot: CompareSlot;
  title: string;
  badge: string;
  file: DocFile | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  extraAction?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      onFile(dropped);
    }
  };

  return (
    <div
      className={`compare-slot${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className={`compare-badge compare-badge-${slot}`}>{badge}</span>

      {file ? (
        <>
          <span className="compare-slot-title">{title}</span>
          <p className="compare-file-name" title={file.name}>
            {file.name}
          </p>
          <div className="compare-slot-actions">
            <ButtonComponent
              cssClass="e-primary"
              iconCss="e-icons e-folder-open"
              content="Choose PDF"
              onClick={() => inputRef.current?.click()}
            />
            <ButtonComponent
              cssClass="e-flat"
              iconCss="e-icons e-close"
              content="Remove"
              onClick={onRemove}
            />
          </div>
        </>
      ) : (
        <>
          <span className="compare-upload">
            <i className="e-icons e-upload-1" />
          </span>
          <p className="compare-slot-title">Drop the {slot} PDF here</p>
          <div className="compare-slot-actions">
            <ButtonComponent
              cssClass="e-primary"
              iconCss="e-icons e-folder-open"
              content="Choose PDF"
              onClick={() => inputRef.current?.click()}
            />
            {extraAction}
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="visually-hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) {
            onFile(selected);
          }
          event.target.value = '';
        }}
      />
    </div>
  );
}

export function CompareView({ openDocument, onClose, onToast }: CompareViewProps) {
  const [original, setOriginal] = useState<DocFile | null>(null);
  const [modified, setModified] = useState<DocFile | null>(null);
  const [comparing, setComparing] = useState(false);
  const [syncScrolling, setSyncScrolling] = useState(true);
  const [loadingSample, setLoadingSample] = useState(false);
  const comparerRef = useRef<PdfComparerComponent | null>(null);

  /*
   * The comparer reads this setting from its own property, so the value is
   * written to the instance. The React property is only applied when it
   * differs from the one the comparer already holds, which would leave the
   * comparer on its first value after the second change.
   */
  useEffect(() => {
    const comparer = comparerRef.current as unknown as ComparerHandle | null;

    if (comparer && comparer.enableSyncScrolling !== syncScrolling) {
      comparer.enableSyncScrolling = syncScrolling;
    }
  }, [syncScrolling]);

  // The comparer reads the options as plain properties, so a literal is used
  // here instead of the TextComparisonOptions class.
  const comparisonOptions = {
    beforeColor: 'red',
    afterColor: 'green',
    beforeColorOpacity: 0.35,
    afterColorOpacity: 0.35,
    enableHighlights: true
  } as unknown as TextComparisonOptions;

  const handleFile = useCallback(
    async (slot: CompareSlot, file: File) => {
      try {
        const doc = await fileToDocFile(file);
        if (slot === 'original') {
          setOriginal(doc);
        } else {
          setModified(doc);
        }
      } catch {
        onToast('Could not read that file');
      }
    },
    [onToast]
  );

  const useSamplePair = useCallback(async () => {
    setLoadingSample(true);
    try {
      const [first, second] = await Promise.all([
        fetchToDocFile(sampleDocumentUrl, 'sample.pdf'),
        fetchToDocFile(sampleDocumentUrlV2, 'sample-v2.pdf')
      ]);
      setOriginal(first);
      setModified(second);
    } catch {
      onToast('Could not load the sample pair');
    } finally {
      setLoadingSample(false);
    }
  }, [onToast]);

  const swap = () => {
    setOriginal(modified);
    setModified(original);
  };

  if (comparing && original && modified) {
    return (
      <div className="overlay compare-overlay" role="dialog" aria-label="Compare documents">
        <div className="compare-result">
          <div className="compare-result-bar">
            <div className="compare-chips">
              <span className="compare-chip">{original.name}</span>
              <span className="compare-chip">{modified.name}</span>
            </div>

            <div className="compare-result-actions">
              <ButtonComponent
                cssClass="e-flat"
                iconCss="e-icons e-swap-arrow"
                content="Change documents"
                onClick={() => setComparing(false)}
              />
              <span className="compare-toggle">
                <SwitchComponent
                  checked={syncScrolling}
                  onChange={(args: ChangeEventArgs & { target?: { checked?: boolean } }) => {
                    /*
                     * The React wrapper does not pass the switch state on the
                     * change event. The switch instance holds the new state.
                     */
                    const target = args.target;
                    setSyncScrolling(target?.checked === true);
                  }}
                />
                <span>Sync scrolling</span>
              </span>
              <ButtonComponent
                cssClass="e-flat"
                iconCss="e-icons e-close"
                content="Close"
                onClick={onClose}
              />
            </div>
          </div>

          <PdfComparerComponent
            id="pdf-comparer"
            ref={comparerRef}
            originalDocumentPath={original.base64}
            modifiedDocumentPath={modified.base64}
            resourceUrl={viewerResourceUrl}
            comparisonOptions={comparisonOptions}
            enableDifferencePanel
            enableSyncScrolling={syncScrolling}
            height="100%"
            width="100%"
          >
            <Inject services={[Magnification, Navigation, TextSelection]} />
          </PdfComparerComponent>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay compare-overlay" role="dialog" aria-label="Compare documents">
      <div className="compare-setup">
        <div className="compare-setup-head">
          <div>
            <h2 className="compare-heading">Compare documents</h2>
            <p className="compare-sub">
              Choose the original and the modified version of the same document. Comparison runs on
              this device.
            </p>
          </div>
          <ButtonComponent
            cssClass="e-flat compare-close"
            iconCss="e-icons e-close"
            content="Close"
            onClick={onClose}
          />
        </div>

        <div className="compare-sample-card">
          <span className="compare-sample-icon e-icons e-file-document" aria-hidden="true" />
          <div className="compare-sample-text">
            <strong>Try it with the sample pair</strong>
            <span>
              Two versions of the same document are already bundled. They fill both slots so you
              can see how the comparison works right away.
            </span>
          </div>
          <ButtonComponent
            cssClass="e-outline compare-sample-button"
            content="Use the sample pair"
            disabled={loadingSample}
            onClick={() => void useSamplePair()}
          />
        </div>

        <div className="compare-slots">
          <Slot
            slot="original"
            title="Original"
            badge="Original"
            file={original}
            onFile={(file) => void handleFile('original', file)}
            onRemove={() => setOriginal(null)}
            extraAction={
              openDocument ? (
                <ButtonComponent
                  cssClass="e-outline"
                  iconCss="e-icons e-file-document"
                  content="Use the open document"
                  onClick={() => setOriginal(openDocument)}
                />
              ) : undefined
            }
          />

          <ButtonComponent
            cssClass="e-flat compare-swap"
            iconCss="e-icons e-swap-arrow"
            title="Swap documents"
            disabled={!original && !modified}
            onClick={swap}
          />

          <Slot
            slot="modified"
            title="Modified"
            badge="Modified"
            file={modified}
            onFile={(file) => void handleFile('modified', file)}
            onRemove={() => setModified(null)}
          />
        </div>

        <ButtonComponent
          cssClass="e-primary compare-go"
          disabled={!original || !modified}
          onClick={() => setComparing(true)}
        >
          Compare
        </ButtonComponent>
      </div>
    </div>
  );
}

export { baseName };
