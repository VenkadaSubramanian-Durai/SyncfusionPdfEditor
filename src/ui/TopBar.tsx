import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

interface TopBarProps {
  fileName: string;
  saveState: string;
  onHome: () => void;
  onExport: () => void;
}

export function TopBar({ fileName, saveState, onHome, onExport }: TopBarProps) {
  return (
    <header className="topbar">
      <ButtonComponent
        cssClass="topbar-home"
        iconCss="e-icons e-home"
        title="Home"
        onClick={onHome}
      />

      <div className="topbar-file">
        <span className="topbar-name" title={fileName}>
          {fileName}
        </span>
        <span className="topbar-state">
          <span className="topbar-dot" aria-hidden="true" />
          {saveState}
        </span>
      </div>

      <ButtonComponent
        cssClass="topbar-export e-primary"
        iconCss="e-icons e-download"
        content="Export"
        onClick={onExport}
      />
    </header>
  );
}
