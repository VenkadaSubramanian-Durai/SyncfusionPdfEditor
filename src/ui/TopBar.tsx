import { Icon } from './icons';

interface Props {
  fileName: string;
  saveState: string;
  compact: boolean;
  onHome: () => void;
  onExport: () => void;
}

/**
 * Our own slim top bar: home, file name and save state, and Export.
 * Page navigation, zoom, search, undo/redo, comments and print are on the
 * PDF Viewer's own main toolbar directly below it.
 */
export function TopBar({ fileName, saveState, compact, onHome, onExport }: Props) {
  return (
    <header className="topbar">
      <button className="mark" onClick={onHome} aria-label="Home" title="Home" />
      <div className="doc">
        <b title={fileName}>{fileName}</b>
        {!compact && <small>{saveState}</small>}
      </div>
      <span className="grow" />
      <div className="acts">
        <button className="btn primary" onClick={onExport} aria-label="Export">
          <Icon name="download" />
          {!compact && 'Export'}
        </button>
      </div>
    </header>
  );
}
