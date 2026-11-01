import { registerLicense, Telemetry } from '@syncfusion/ej2-base';

/** Values that only mark the key as "not set yet". */
const PLACEHOLDER_KEYS = ['', 'your-syncfusion-license-key'];

export function registerSyncfusionLicense(): void {
  const key = (import.meta.env.VITE_SYNCFUSION_LICENSE as string | undefined)?.trim() ?? '';

  // Registering a placeholder makes the viewer refuse to render, so the key is
  // only sent when a real one is configured. Without a key the app still works
  // and Syncfusion shows its trial banner.
  if (key && !PLACEHOLDER_KEYS.includes(key.toLowerCase())) {
    registerLicense(key);
  }

  if (import.meta.env.VITE_DISABLE_TELEMETRY === 'true') {
    Telemetry.disable();
  }
}
