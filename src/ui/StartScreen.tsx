import { useRef, useState } from 'react';
import { Icon } from './icons';

export type StartTask = 'view' | 'annotate' | 'sign' | 'organize' | 'redact' | 'compare';

const TASKS: { id: StartTask; icon: string; title: string; text: string }[] = [
  { id: 'annotate', icon: 'annotate', title: 'Annotate', text: 'Highlight, comment, draw, measure' },
  { id: 'sign', icon: 'sign', title: 'Fill & Sign', text: 'Fill forms, add a signature' },
  { id: 'organize', icon: 'organize', title: 'Organize', text: 'Reorder, rotate, insert, delete' },
  { id: 'redact', icon: 'redact', title: 'Redact', text: 'Permanently hide text' },
  { id: 'compare', icon: 'compare', title: 'Compare', text: 'See what changed between versions' },
];

interface Props {
  /** Name of the PDF already open in the editor, if any. */
  continueWith?: string;
  onContinue: () => void;
  onOpenFile: (file: File, task: StartTask) => void;
  onSample: (task: StartTask) => void;
}

export function StartScreen({ continueWith, onContinue, onOpenFile, onSample }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [task, setTask] = useState<StartTask>('view');

  const pick = (t: StartTask) => {
    setTask(t);
    input.current?.click();
  };

  return (
    <section className="start" aria-label="Start">
      <div className="start-inner">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          PDF Editor
        </div>
        <div>
          <h1>Edit, sign and compare PDFs. Free, and on your device.</h1>
          <p className="lede">Nothing is uploaded. Your original file always stays unchanged.</p>
        </div>
        {continueWith && (
          <button className="continue" onClick={onContinue}>
            <Icon name="prev" />
            <span>
              Continue editing <b>{continueWith}</b>
            </span>
          </button>
        )}
        <div
          className={`drop${over ? ' over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onOpenFile(f, 'view');
          }}
        >
          <Icon name="upload" size={44} />
          <b>Drop a PDF here</b>
          <span className="muted">or</span>
          <div className="row">
            <button className="btn primary" onClick={() => pick('view')}>
              <Icon name="open" />
              Open PDF
            </button>
            <button className="btn" onClick={() => onSample('view')}>
              Try the sample
            </button>
          </div>
        </div>
        <div className="tiles">
          {TASKS.map((t) => (
            <button
              key={t.id}
              className="tile"
              onClick={() => (t.id === 'compare' ? onSample('compare') : pick(t.id))}
              title={t.id === 'compare' ? 'Choose two PDFs to compare' : `Open a PDF to ${t.title.toLowerCase()}`}
            >
              <span className="tile-ic">
                <Icon name={t.icon} />
              </span>
              <b>{t.title}</b>
              <small>{t.text}</small>
            </button>
          ))}
        </div>
        <div className="foot">
          <span className="priv">
            <Icon name="shield" size={15} />
            Files stay on this device
          </span>
          <span>Powered by Syncfusion PDF Viewer · Built with BoldCreate</span>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onOpenFile(f, task);
          e.target.value = '';
        }}
      />
    </section>
  );
}
