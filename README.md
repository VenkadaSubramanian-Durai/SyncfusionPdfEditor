# cross-platform-pdf-editor

Cross-platform PDF application built with Syncfusion React PDF Viewer, Tauri, and BoldCreate. Supports deployment as a web application and native packages for Windows, macOS, and Android using a shared codebase and modern cross-platform architecture.

See [`docs/SPEC.md`](docs/SPEC.md) for the end-to-end specification that drives this project.

## Project structure

```
cross-platform-pdf-editor/
├── docs/SPEC.md                     living specification
├── public/
│   ├── ej2-pdfviewer-lib/           PDFium assets copied by postinstall
│   ├── sample.pdf                   3-page sample (text, floor plan, form)
│   └── sample-v2.pdf                changed copy used by the Compare sample pair
├── scripts/
│   ├── copy-viewer-assets.mjs       runs in npm install (postinstall)
│   └── make-samples.py              regenerates public/sample*.pdf
├── src/                             React + Syncfusion Viewer UI
└── src-tauri/                       Tauri shell and the native-print plugin
```

## Prerequisites

- Node.js **22 LTS** (minimum 20.19)
- Rust stable **≥ 1.85**
- On Linux: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libssl-dev`, `libxdo-dev`, `build-essential`, `pkg-config`
- On Windows: the Visual Studio C++ Build Tools ("Desktop development with C++") and the WebView2 runtime
- On macOS: the Xcode Command Line Tools

## Setup

```bash
npm install
cp .env.example .env   # set VITE_SYNCFUSION_LICENSE (optional)
npm run build          # type-check + web build
```

`npm install` runs `scripts/copy-viewer-assets.mjs`, which copies `pdfium.js` and `pdfium.wasm` from the Syncfusion package into `public/ej2-pdfviewer-lib/`. If the postinstall step cannot find the Syncfusion package folder, download the assets manually from <https://cdn.syncfusion.com/ej2/35.1.40/dist/ej2-pdfviewer-lib/> into `public/ej2-pdfviewer-lib/`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts Vite on `http://localhost:1420` |
| `npm run build` | Type-checks the project and produces `dist/` |
| `npm run preview` | Serves the built web bundle |
| `npm run desktop:dev` | Runs the app in the Tauri desktop shell |
| `npm run desktop:build` | Builds the native desktop bundles |
| `npm run android:init` | One-time initialisation of the Android project (after adding a native plugin, re-run) |
| `npm run android:dev` | Runs the app in an Android emulator or device |
| `npm run android:build` | Builds an Android APK |
| `npm run ios:init` | One-time initialisation of the iOS project (Mac only) |
| `npm run ios:dev` | Runs the app in the iOS Simulator or on a device |
| `npm run ios:build` | Builds an iOS IPA |

## Configuration

All Tauri-specific settings (identifier, version, signing fields, file associations, bundle metadata) live in `src-tauri/tauri.conf.json`. The shared settings are kept in one file per OS so they can be edited without regenerating the mobile projects.

## Open with

- Windows / Linux / macOS: `bundle.fileAssociations` in `tauri.conf.json` registers the `.pdf` extension. The startup file is read in `src-tauri/src/lib.rs`.
- macOS and iOS: the `RunEvent::Opened` event delivers "Open with" requests while the app is running. They are forwarded as a `open-file` Tauri event that the React layer listens to.
- Android / iOS Open-with intent filters and document types are tracked by TODO-10.

## License

The Syncfusion license key is read from `VITE_SYNCFUSION_LICENSE` at build time and registered in `src/license.ts`. Release builds are expected to ship a key sourced per TODO-07. Set `VITE_DISABLE_TELEMETRY=true` to disable Syncfusion telemetry.