import { useRef, useState } from 'react';
import { PdfComparerComponent, type TextComparisonOptions } from '@syncfusion/ej2-react-pdfviewer';
import { Icon } from './icons';

export interface DocFile {
  name: string;
  base64: string;
}

interface Props {
  /** The PDF open in the editor, offered as a one-click choice for the original. */
  openDocument: DocFile | null;
  resourceUrl: string;
  /** Loads the bundled sample pair (sample.pdf and sample-v2.pdf) for a quick demo. */
  loadSamplePair: () => Promise<[DocFile, DocFile]>;
  onClose: () => void;
}

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const options = {
  beforeColor: '#ef4444',
  afterColor: '#22c55e',
  beforeColorOpacity: 0.35,
  afterColorOpacity: 0.35,
  enableHighlights: true,
} as TextComparisonOptions;

/** One document slot on the setup step: drop a PDF, choose one, or use the open document. */
function Slot(props: {
  kind: 'old' | 'new';
  title: string;
  hint: string;
  file: DocFile | null;
  openDocument?: DocFile | null;
  onChange: (f: DocFile | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = async (f: File | undefined) => {
    if (f) props.onChange({ name: f.name, base64: await readAsBase64(f) });
  };
  return (
    <div
      className={`slot${over ? ' over' : ''}${props.file ? ' filled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void take(e.dataTransfer.files[0]);
      }}
    >
      <span className={`tag ${props.kind}`}>{props.title}</span>
      {props.file ? (
        <>
          <b className="slot-name" title={props.file.name}>
            {props.file.name}
          </b>
          <button className="btn" onClick={() => props.onChange(null)}>
            Remove
          </button>
        </>
      ) : (
        <>
          <Icon name="upload" size={32} />
          <span className="muted">{props.hint}</span>
          <div className="row">
            <button className="btn primary" onClick={() => input.current?.click()}>
              <Icon name="open" />
              Choose PDF
            </button>
            {props.openDocument && (
              <button className="btn" onClick={() => props.onChange(props.openDocument!)}>
                Use the open document
              </button>
            )}
          </div>
        </>
      )}
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/**
 * Compare two PDFs with the Syncfusion PdfComparer (semantic text comparison).
 * Step 1: choose the original and the modified PDF. Step 2: side-by-side result
 * with the built-in difference panel and synced scrolling. Runs on the device.
 */
export function CompareView({ openDocument, resourceUrl, loadSamplePair, onClose }: Props) {
  const [original, setOriginal] = useState<DocFile | null>(null);
  const [modified, setModified] = useState<DocFile | null>(null);
  const [running, setRunning] = useState(false);
  const [sync, setSync] = useState(true);

  const ready = !!original && !!modified;

  return (
    <section className="compare" aria-label="Compare documents">
      <header className="compare-head">
        <div>
          <h2>Compare documents</h2>
          <p className="muted">
            {running
              ? 'Red marks text removed from the original; green marks text added in the modified version.'
              : 'Choose the original and the modified version of the same document. Comparison runs on this device.'}
          </p>
        </div>
        <button className="ib" title="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>

      {!running ? (
        <div className="compare-setup">
          <div className="slots">
            <Slot
              kind="old"
              title="Original"
              hint="Drop the original PDF here"
              file={original}
              openDocument={openDocument}
              onChange={setOriginal}
            />
            <button
              className="ib swap"
              title="Swap original and modified"
              disabled={!original && !modified}
              onClick={() => {
                setOriginal(modified);
                setModified(original);
              }}
            >
              <Icon name="swap" />
            </button>
            <Slot
              kind="new"
              title="Modified"
              hint="Drop the modified PDF here"
              file={modified}
              onChange={setModified}
            />
          </div>
          <div className="row">
            <button className="btn primary big" disabled={!ready} onClick={() => setRunning(true)}>
              <Icon name="compare" />
              Compare
            </button>
          </div>
          <p className="muted center">
            No files at hand?{' '}
            <button
              className="link"
              onClick={async () => {
                const [a, b] = await loadSamplePair();
                setOriginal(a);
                setModified(b);
              }}
            >
              Use the sample pair
            </button>
          </p>
        </div>
      ) : (
        <>
          <div className="compare-bar">
            <span className="fchip">
              <span className="tag old">Original</span>
              <b>{original!.name}</b>
            </span>
            <span className="fchip">
              <span className="tag new">Modified</span>
              <b>{modified!.name}</b>
            </span>
            <button className="btn" onClick={() => setRunning(false)}>
              Change documents
            </button>
            <span className="grow" />
            <label className="toggle">
              <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} /> Sync scrolling
            </label>
          </div>
          <div className="compare-host">
            <PdfComparerComponent
              key={`${original!.name}|${modified!.name}|${original!.base64.length}|${modified!.base64.length}`}
              id="pdf-comparer"
              originalDocumentPath={original!.base64}
              modifiedDocumentPath={modified!.base64}
              resourceUrl={resourceUrl}
              enableDifferencePanel={true}
              enableSyncScrolling={sync}
              comparisonOptions={options}
              height="100%"
              width="100%"
            />
          </div>
        </>
      )}
    </section>
  );
}
