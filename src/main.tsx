import './license';
import { createRoot } from 'react-dom/client';
import '@syncfusion/ej2-tailwind3-theme/styles/pdfviewer/index.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  // StrictMode is left out on purpose: its double mount re-creates the viewer.
  <App />,
);
