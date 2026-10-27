# Syncfusion PDF Editor: one sample for web, desktop and mobile

This is a free PDF editor built on the **Syncfusion React PDF Viewer**. One React code base runs as:

| Platform | Shell | Output |
|---|---|---|
| **Web** | Vite (static site) | `dist/` folder you can host on any web server |
| **Desktop** | Electron | Windows installer and portable `.exe` (macOS `.dmg` and Linux AppImage also supported) |
| **Mobile** | Capacitor | Android app (Android Studio) and iOS app (Xcode on a Mac) |

The PDF engine (PDFium WebAssembly) is bundled inside the app. Documents are opened, edited and saved **on the device**, with no server.

## What the sample does

- Opens a bundled 3-page `sample.pdf` on start. Use **Open** to pick your own file.
- **View:** page navigation, zoom, pan, text selection, search, thumbnails, bookmarks, print.
- **Annotate:** highlight, underline, strikethrough, squiggly, shapes, measurement (distance, perimeter, area, radius, volume), free text, stamps, sticky notes, ink, comments panel.
- **Forms:** fill existing fields, form designer (add text boxes, check boxes, radio buttons, drop-downs, signature fields), handwritten signature.
- **Redaction:** mark areas and apply redaction.
- **Organize pages:** reorder, rotate, insert, duplicate, delete, import another PDF.
- **Download:** saves a new copy with every change.
  - Desktop: uses the normal save dialog.
  - Android and iOS: uses the system share sheet (Save to Files, Drive, email and so on).
- **Desktop only:** double-click a PDF or choose "Open with" to open it in the app.
- A chip in the header shows the current platform (Web, Desktop, Android or iOS), so you can see the same code running everywhere.

## Project layout

```
SyncfusionPdfEditor/
├─ src/
│  ├─ App.tsx              PDF Viewer, toolbar, document loading, mobile save
│  ├─ main.tsx             Entry point and theme CSS
│  ├─ license.ts           Registers the Syncfusion license key from .env
│  ├─ platform.ts          Detects web / desktop / android / ios, resolves asset URLs
│  ├─ mobile-save.ts       Android/iOS: write the PDF to Documents and open the share sheet
│  └─ styles.css           App bar and layout
├─ public/
│  ├─ sample.pdf           Sample document (text, floor plan, form fields)
│  └─ ej2-pdfviewer-lib/   PDFium engine, copied here automatically by "npm install"
├─ electron/
│  ├─ main.cjs             Desktop window, app:// protocol, open-with-PDF handling
│  └─ preload.cjs          Safe bridge between Electron and the web app
├─ scripts/copy-viewer-assets.mjs
├─ capacitor.config.ts     Mobile app id, name and web folder
├─ vite.config.ts, tsconfig.json, index.html
├─ .env.example            Template for your license key
└─ package.json            All build scripts
```

---

## 1. Prerequisites

| For | Install |
|---|---|
| All platforms | [Node.js 22 LTS](https://nodejs.org) (Node 20.19 or later works). Check with `node -v`. |
| Desktop build for Windows | Nothing extra. Build on Windows. |
| Desktop build for macOS | A Mac (needed for `.dmg`). |
| Android | [Android Studio](https://developer.android.com/studio) (Ladybug or later) with an Android SDK and an emulator or a USB-connected phone. Android Studio includes the JDK it needs. |
| iOS | A Mac with [Xcode](https://developer.apple.com/xcode/) 16 or later, plus an Apple ID for running on a device. |

## 2. Install and add your license key

Open a terminal (PowerShell on Windows) in this folder:

```powershell
cd D:\Analysis\PDFrig\SyncfusionPdfEditor
npm install
```

`npm install` also copies the PDF engine into `public/ej2-pdfviewer-lib`. You should see `[copy-viewer-assets] Copied PDF Viewer engine ...` in the output.

Next, add your Syncfusion license key:

1. Copy `.env.example` to `.env`:

   ```powershell
   copy .env.example .env
   ```

2. Get a key from [syncfusion.com/account/downloads](https://www.syncfusion.com/account/downloads) (choose **Get License Key**, platform **JavaScript**, version **35.x**). The [free Community License](https://www.syncfusion.com/products/communitylicense) works.
3. Paste the key into `.env`:

   ```
   VITE_SYNCFUSION_LICENSE=your-key-here
   ```

Without a key the app still works, but it shows a trial banner across the top.

## 3. Web

**Run locally** (with hot reload while you edit code):

```powershell
npm run dev
```

Open <http://127.0.0.1:5173>. The sample PDF loads automatically and the header chip shows **Web**.

**Build for production:**

```powershell
npm run build
npm run preview          # optional: test the production build at http://127.0.0.1:4173
```

To deploy, upload the whole `dist/` folder to any static host: IIS, Azure Static Web Apps, Netlify, GitHub Pages, S3 and so on. No server code is needed.

> Make sure your host serves `.wasm` files as `application/wasm`. Most hosts do this already. On IIS, add a MIME map for `.wasm` in `web.config`.

## 4. Desktop (Electron)

**Run the desktop app:**

```powershell
npm run desktop:dev
```

This builds the web app and opens it in a desktop window. The header chip shows **Desktop**.

**Build a Windows installer and a portable exe:**

```powershell
npm run desktop:build
```

The output goes to `release/`:

- `Syncfusion PDF Editor Setup 0.1.0.exe`: the installer. It registers the app for `.pdf` files.
- `Syncfusion PDF Editor 0.1.0.exe`: the portable version, no install needed.

To check the PDF association, right-click any PDF, choose **Open with → Syncfusion PDF Editor**, and the file opens in the app.

**Other operating systems:**

```bash
npm run desktop:build:mac     # on a Mac   → release/*.dmg
npm run desktop:build:linux   # on Linux   → release/*.AppImage
```

> The builds are **unsigned**, so Windows SmartScreen shows "Windows protected your PC". Choose **More info → Run anyway**. For public release, sign the app with a code-signing certificate ([electron-builder code signing](https://www.electron.build/code-signing)).

## 5. Mobile: Android

**One-time setup.** This creates the `android/` native project:

```powershell
npm run build
npx cap add android
```

**Build and open in Android Studio:**

```powershell
npm run mobile:android
```

This builds the web app, copies it into the Android project (`cap sync`), and opens Android Studio. Then:

1. Wait for the Gradle sync to finish (the first time takes a few minutes).
2. Pick an emulator or a connected phone (with USB debugging turned on).
3. Click **Run ▶**. The app opens with the sample PDF, the mobile toolbar, and **Android** in the header chip.

**Build an APK or app bundle:** in Android Studio, choose **Build → Generate Signed App Bundle / APK...**. For a quick test, **Build → Build App Bundle(s) / APK(s) → Build APK(s)** creates `android/app/build/outputs/apk/debug/app-debug.apk`.

When you change the web code, run `npm run mobile:android` again, or `npm run mobile:sync` if Android Studio is already open, then click Run.

## 6. Mobile: iOS (Mac only)

**One-time setup:**

```bash
npm run build
npx cap add ios
```

**Build and open in Xcode:**

```bash
npm run mobile:ios
```

Then, in Xcode:

1. Select the **App** target, open **Signing & Capabilities**, and choose your Team (your Apple ID).
2. Pick a simulator or a connected iPhone.
3. Click **Run ▶**.

To let users see saved PDFs in the Files app, open `ios/App/App/Info.plist` and add:

```xml
<key>UIFileSharingEnabled</key><true/>
<key>LSSupportsOpeningDocumentsInPlace</key><true/>
```

## 7. All scripts

| Command | What it does |
|---|---|
| `npm run dev` | Web dev server with hot reload |
| `npm run build` | Type-check and build the web app into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run desktop:dev` | Build and run the Electron desktop app |
| `npm run desktop:build` | Windows installer and portable exe in `release/` |
| `npm run desktop:build:mac` / `:linux` | macOS dmg or Linux AppImage |
| `npm run mobile:sync` | Build and copy the web app into the Android and iOS projects |
| `npm run mobile:android` | Build, sync and open Android Studio |
| `npm run mobile:ios` | Build, sync and open Xcode |

## 8. How the single code base works

- **One UI.** `src/App.tsx` is the whole app. On phones and narrow screens, the PDF Viewer switches to its built-in mobile toolbar automatically.
- **Works offline.** `scripts/copy-viewer-assets.mjs` copies the PDFium WebAssembly engine into the app. `resourceUrl` points to that local copy, so no CDN is needed.
- **Same document loading everywhere.** Documents are passed to the viewer as base64, not as URLs. That way the same code works on `http(s)://` (web), `app://` (Electron) and `capacitor://` (iOS).
- **Platform-specific code is small and isolated:**
  - `electron/`: the desktop window and opening PDFs from the operating system.
  - `src/mobile-save.ts`: on Android and iOS, Download goes to the Documents folder and the share sheet, because mobile WebViews can't download blob files.
- **Vite `base: './'`** keeps every asset path relative, so one build in `dist/` serves all three shells.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| Blank viewer, console says `pdfium.wasm` not found | Run `npm install` again, or `node scripts/copy-viewer-assets.mjs`, and check that `public/ej2-pdfviewer-lib/` has `pdfium.js` and `pdfium.wasm`. |
| Trial banner at the top | Add `VITE_SYNCFUSION_LICENSE` to `.env`, then rebuild. The key must match the package version (35.x). |
| `npm install` fails behind a company proxy | Run `npm config set proxy http://proxy:port` and `npm config set https-proxy http://proxy:port`. |
| Electron download fails during install | Set `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` and run `npm install` again. |
| Android Studio: "SDK location not found" | Open the `android` folder in Android Studio once. It creates `local.properties` with your SDK path. |
| Font looks slightly different offline | The Tailwind 3 theme loads the Inter font from Google Fonts. Offline, it falls back to the system font. To bundle it, run `npm i @fontsource/inter` and add `import '@fontsource/inter'` in `src/main.tsx`. |

## 10. Notes

- **Telemetry.** The Syncfusion base package can send anonymous component-usage events in development builds. To turn this off, set `VITE_DISABLE_TELEMETRY=true` in `.env`. Your documents are never sent.
- **Versions used:** Syncfusion PDF Viewer 35.1.40, React 19.2, Vite 8.3, Electron 44.7, electron-builder 26.17, Capacitor 8.5.
- **Next steps for the product:**
  - Sign the desktop and mobile builds.
  - Add an app icon (`build/icon.ico` for Electron; `npx @capacitor/assets generate` for mobile).
  - Move from this sample to the full Phase 1 UI (mode tabs, start screen, recent files).
