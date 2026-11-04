import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The dark theme carries the dark colour values and the light theme the light
// ones. The light theme is imported last so that its `:root` values win,
// while its `.e-dark-mode` block supplies the dark values for the body when
// the operating system asks for a dark colour scheme.
import '@syncfusion/ej2-tailwind3-dark-theme/styles/pdfviewer/index.css';
import '@syncfusion/ej2-tailwind3-theme/styles/pdfviewer/index.css';
// Syncfusion Switch renders as a bare checkbox without its own CSS, so the
// SwitchComponent used by the Compare view needs the Switch theme too.
import '@syncfusion/ej2-tailwind3-dark-theme/styles/switch/switch.css';
import '@syncfusion/ej2-tailwind3-theme/styles/switch/switch.css';
import './styles.css';
import App from './App';
import { registerSyncfusionLicense } from './license';
import { watchColorScheme } from './platform';

registerSyncfusionLicense();

// Follows the operating system colour scheme.
watchColorScheme();

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
