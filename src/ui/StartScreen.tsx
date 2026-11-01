import { useRef, useState } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { AppMarkIcon } from './icons';

export type StartTask = 'view' | 'annotate' | 'sign' | 'organize' | 'redact' | 'compare';

interface StartScreenProps {
  /** Name of the document currently open, when the screen is shown as an overlay. */
  continueWith?: string;
  onOpenFile: (file: File, task?: StartTask) => void;
  onOpenSample: () => void;
  onContinue?: () => void;
  onTask: (task: StartTask) => void;
}

const TILES: { id: StartTask; title: string; description: string; iconCss: string }[] = [
  {
    id: 'annotate',
    title: 'Annotate',
    description: 'Highlight, comment, draw, measure',
    iconCss: 'e-icons e-edit'
  },
  {
    id: 'sign',
    title: 'Fill & Sign',
    description: 'Fill forms, add a signature',
    iconCss: 'e-icons e-signature'
  },
  {
    id: 'organize',
    title: 'Organize',
    description: 'Reorder, rotate, insert, delete',
    iconCss: 'e-icons e-organize-pdf'
  },
  {
    id: 'redact',
    title: 'Redact',
    description: 'Permanently hide text',
    iconCss: 'e-icons e-text-redact'
  },
  {
    id: 'compare',
    title: 'Compare',
    description: 'See what changed between versions',
    iconCss: 'e-icons e-building-block'
  }
];

export function StartScreen({
  continueWith,
  onOpenFile,
  onOpenSample,
  onContinue,
  onTask
}: StartScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingTask, setPendingTask] = useState<StartTask | undefined>(undefined);
  const [dragging, setDragging] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }
    if (pendingTask) {
      onOpenFile(file, pendingTask);
      setPendingTask(undefined);
    } else {
      onOpenFile(file);
    }
  };

  const handleTile = (task: StartTask) => {
    if (task === 'compare') {
      onTask('compare');
      return;
    }
    setPendingTask(task);
    pickFile();
  };

  return (
    <div className="start">
      <div className="start-inner">
        <div className="start-brand">
          <AppMarkIcon size={30} />
          <span className="start-brand-name">PDF Editor</span>
        </div>

        <h1 className="start-title">Edit, sign and compare PDFs. Free, and on your device.</h1>
        <p className="start-sub">Nothing is uploaded. Your original file always stays unchanged.</p>

        <div
          className={`dropzone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          <span className="dropzone-upload">
            <i className="e-icons e-upload-1" />
          </span>
          <p className="dropzone-title">Drop a PDF here</p>
          <p className="dropzone-or">or</p>
          <div className="dropzone-actions">
            <ButtonComponent
              cssClass="e-primary"
              iconCss="e-icons e-folder-open"
              content="Open PDF"
              onClick={pickFile}
            />
            <ButtonComponent
              cssClass="e-outline"
              iconCss="e-icons e-file-document"
              content="Try the sample"
              onClick={onOpenSample}
            />
          </div>
        </div>

        <div className="tiles">
          {TILES.map((tile) => (
            <ButtonComponent
              key={tile.id}
              cssClass="tile"
              onClick={() => handleTile(tile.id)}
            >
              <span className="tile-icon">
                <i className={tile.iconCss} />
              </span>
              <span className="tile-title">{tile.title}</span>
              <span className="tile-desc">{tile.description}</span>
            </ButtonComponent>
          ))}
        </div>

        {continueWith ? (
          <ButtonComponent
            cssClass="continue e-primary"
            iconCss="e-icons e-arrow-left"
            content={`Continue editing ${continueWith}`}
            onClick={onContinue}
          />
        ) : null}

        <footer className="start-footer">
          <span className="start-trust">
            <i className="e-icons e-lock" />
            Files stay on this device
          </span>
          <span className="start-credit">Powered by Syncfusion PDF Viewer · Built with BoldCreate</span>
        </footer>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="visually-hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
