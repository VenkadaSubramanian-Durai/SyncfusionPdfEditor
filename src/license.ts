import { registerLicense, Telemetry } from '@syncfusion/ej2-base';

// The key is read from the .env file (VITE_SYNCFUSION_LICENSE=...).
// Without a key the viewer still works but shows a license banner.
const key = import.meta.env.VITE_SYNCFUSION_LICENSE as string | undefined;

if (key && key.trim()) {
  registerLicense(key.trim());
} else {
  console.warn('[license] VITE_SYNCFUSION_LICENSE is not set. See README, step 2.');
}

// Optional: turn off Syncfusion's anonymous component-usage telemetry
// (development builds only). Set VITE_DISABLE_TELEMETRY=true in .env.
if (import.meta.env.VITE_DISABLE_TELEMETRY === 'true') {
  Telemetry.disable();
}
