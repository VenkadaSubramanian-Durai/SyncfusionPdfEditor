import type { CapacitorConfig } from '@capacitor/cli';

// Mobile (Android / iOS) shell. Capacitor copies the web build in dist/ into
// the native projects created by "npx cap add android" and "npx cap add ios".
const config: CapacitorConfig = {
  appId: 'com.syncfusion.pdfeditor.sample',
  appName: 'Syncfusion PDF Editor',
  webDir: 'dist',
  android: { allowMixedContent: false },
};

export default config;
