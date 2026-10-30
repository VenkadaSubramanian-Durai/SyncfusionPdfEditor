# Syncfusion PDF Editor (Tauri edition)

This is a free PDF editor built on the **Syncfusion React PDF Viewer** and packaged with **Tauri 2**. One React code base and one native shell cover every platform:

| Platform | Command | Output |
|---|---|---|
| **Web** | `npm run build` | `dist/` folder for any static web host |
| **Windows** | `npm run desktop:build` | `.exe` installer (NSIS) and `.msi` |
| **macOS** | `npm run desktop:build` (on a Mac) | `.app` and `.dmg` |
| **Linux** | `npm run desktop:build` (on Linux) | `.deb`, `.rpm`, `.AppImage` |
| **Android** | `npm run android:build` | `.apk` (or `.aab` for Google Play) |
| **iOS** | `npm run ios:build` (on a Mac) | `.ipa` through Xcode |

It's the same app as the Electron and Capacitor sample in `..\SyncfusionPdfEditor`. Only the packaging shell is different, so you can compare the two approaches directly.

## Quick start (do these in order)

> **Run `npm install` first.** Every other command (`npm run build`, `npm run dev`, `npm run desktop:dev`) uses tools that `npm install` downloads into `node_modules`. If you skip it, you'll see **`'tsc' is not recognized as an internal or external command`**.

Open **PowerShell** or **Command Prompt** in the project folder and run:

```powershell
# 1. Go to the project folder
cd D:\Analysis\PDFrig\SyncfusionPdfEditor-Tauri

# 2. Install packages (once, and again whenever package.json changes)
npm install
#    The last lines should include:
#    [copy-viewer-assets] Copied PDF Viewer engine to ...\public\ej2-pdfviewer-lib

# 3. Add your Syncfusion license key (optional; without it a trial banner shows)
copy .env.example .env
notepad .env          # set VITE_SYNCFUSION_LICENSE=your-key, then save

# 4. Try it in the browser
npm run dev           # open http://127.0.0.1:5173 ; press Ctrl+C to stop

# 5. Build the web app
npm run build         # creates the dist\ folder

# 6. Run as a desktop app (needs Rust + C++ Build Tools, see section 1)
npm run desktop:dev   # first run compiles Rust: 3-5 minutes

# 7. Build the Windows installer
npm run desktop:build # output in src-tauri\target\release\bundle\
```

Check your tools before step 2:

```powershell
node -v      # v22.x (v20.19 or later works)
npm -v       # 10.x
rustc -V     # 1.85 or later (only needed for steps 6 and 7)
cargo -V     # must work too; if not, install Rust (section 1) and open a NEW terminal
```

## What the sample does

The app wraps the Syncfusion PDF Viewer in a slim top bar and a feature rail of our own. The **viewer's main toolbar stays visible**, with the options our UI already covers hidden. Each rail feature opens the **viewer's own docked toolbar** under it, and nothing floats over the page.

```
┌───────────────────────────────────────────────────────────────────────┐
│ ▣ sample.pdf  · Saved on this device                           Export │  ← our top bar
├──────┬────────────────────────────────────────────────────────────────┤
│ View │ Open │ |‹ ‹ 1 of 3 › ›| │ − + 100% │ Select Pan │ Undo Redo │ Comments   Search Print │  ← viewer main toolbar (trimmed)
│ Anno │ [ viewer's annotation / form designer / redaction toolbar   ✕ ] │  ← opened from the rail
│ Sign │                                                                │
│Redact│                        PDF page (viewer)                       │
│ Org  │                                                                │
│ Comp │                                                                │
│ Pages│                                                                │
└──────┴────────────────────────────────────────────────────────────────┘
```

| UI part | What it does | Syncfusion API it calls |
|---|---|---|
| **Start screen** | Drop zone, Open PDF, Try the sample, task tiles (Annotate, Fill & Sign, Organize, Redact, Compare), and **Continue editing** when a PDF is open | Loads the file into the viewer, then opens that feature. The editor stays loaded underneath, so edits are kept |
| **Top bar (ours)** | Home, file name and save state, Export a copy | `download()` (native Save As in the Tauri app) |
| **Viewer main toolbar** | Open, page navigation, zoom, select/pan, undo/redo, comments, search, print | Built in. `toolbarSettings.toolbarItems`; items our UI covers are hidden with `toolbar.showToolbarItem([...], false)` |
| **Hidden toolbar items** | Annotate, Form Designer, Redaction, Organize (in the rail) and Download (our Export) | Kept configured, because the feature toolbars depend on them, but not shown |
| **Rail: Annotate** | Opens the viewer's annotation toolbar | `toolbar.showAnnotationToolbar(true)` |
| **Rail: Fill & Sign** | Opens the viewer's form designer toolbar | `formDesignerToolbarModule.showFormDesignerToolbar()` |
| **Rail: Redact** | Opens the viewer's redaction toolbar | `toolbar.showRedactionToolbar(true)` |
| **Rail: Organize** | Opens the viewer's Organize Pages view | `pageOrganizer.openPageOrganizer()` |
| **Rail: Compare** | Step 1: choose the **Original** and **Modified** PDF (drop, Choose PDF, or Use the open document). Step 2: side-by-side result with the difference panel and synced scrolling | `PdfComparerComponent` |
| **Rail: Pages** | Opens or closes the viewer's thumbnail pane | `thumbnailView.openThumbnailPane()` / `closeThumbnailPane()` |
| **Viewer's ✕ on a toolbar** | Closes that toolbar; the rail goes back to View | Reads `isToolbarHidden` on each toolbar module |
| **Phone** | The rail becomes bottom tabs (View, Annotate, Sign, Pages, More) | Same APIs; `enableDesktopMode` keeps the full toolbars on touch devices |

- **Opening files:** on desktop, double-click a PDF or use "Open with" to open it straight into the editor.
- **Saving:** in the Tauri app, Export opens the native **Save As** dialog.
- **Theme:** the Tailwind 3 theme is re-tinted to the app's teal accent, and the viewer follows the system's dark mode.
- **Compare:** you always choose two documents. **Compare** stays disabled until both the Original and the Modified PDF are set. **Use the sample pair** loads `public/sample.pdf` and `public/sample-v2.pdf` for a quick demo. **Change documents** goes back to the picker.
- **Switching features:** Organize Pages (and the comment panel, when going to Compare) closes automatically when you pick another feature in the rail.

## How Tauri differs from the Electron + Capacitor sample

| | This sample (Tauri) | Electron + Capacitor sample |
|---|---|---|
| Native shells | 1 (Tauri, for desktop and mobile) | 2 |
| Browser engine | The system's WebView: WebView2 (Windows), WebKit (macOS, iOS, Linux), Android System WebView | Bundled Chromium on desktop; system WebView on mobile |
| Installer size | Small (a few MB plus the 4 MB PDF engine) | Large (around 80–150 MB with Chromium) |
| Native code | Rust (`src-tauri/src/lib.rs`) plus a small print plugin (Rust, Swift, Kotlin) | JavaScript |
| Extra tools to install | Rust, plus the platform toolchain | None on desktop |

## Project layout

```
SyncfusionPdfEditor-Tauri/
├─ src/                        React app (same UI as the other sample)
│  ├─ App.tsx                  Screens (start, editor, compare), viewer events, actions
│  ├─ viewer-modes.ts          Hides duplicate toolbar items; opens/closes the viewer's toolbars and panels
│  ├─ ui/TopBar.tsx            Top bar: home, file name, Export
│  ├─ ui/Rail.tsx              Left rail (desktop/tablet) and bottom tabs (phone)
│  ├─ ui/StartScreen.tsx       Start screen: drop zone, open, sample, task tiles
│  ├─ ui/CompareView.tsx       Compare: choose two PDFs, then PdfComparerComponent
│  ├─ ui/icons.tsx             Icons for our own UI parts
│  ├─ native.ts                Tauri bridge: startup file, open-file event, Save As + write, native print
│  ├─ platform.ts              Detects web / desktop / android / ios; asset URLs
│  ├─ license.ts, main.tsx, styles.css
├─ public/sample.pdf           Sample document
├─ public/sample-v2.pdf        Changed copy of the sample (the Compare sample pair)
├─ public/ej2-pdfviewer-lib/   PDFium engine, copied here by "npm install"
├─ scripts/copy-viewer-assets.mjs
├─ src-tauri/                  Native shell
│  ├─ tauri.conf.json          App name, window, CSP, bundle targets, .pdf file association
│  ├─ capabilities/default.json  Permissions: core, Save As dialog, write the chosen file
│  ├─ src/lib.rs               Opens PDFs passed by the OS; macOS/iOS "Open with" event
│  ├─ plugins/native-print/    Print on macOS, iOS and Android (see "Printing" below)
│  │  ├─ src/macos.rs          macOS: PDFKit + standard Print panel
│  │  ├─ ios/Sources/          iOS/iPadOS: AirPrint sheet (Swift)
│  │  └─ android/src/          Android: system print screen (Kotlin)
│  ├─ src/main.rs, build.rs, Cargo.toml
│  └─ icons/                   App icons for every platform (generated)
├─ index.html, vite.config.ts, tsconfig.json, package.json
└─ .env.example                Template for your Syncfusion license key
```

`src-tauri/gen/android` and `src-tauri/gen/apple` are created by the `android:init` and `ios:init` commands (steps 6 and 7).

---

## 1. Prerequisites

| For | Install |
|---|---|
| All platforms | [Node.js 22 LTS](https://nodejs.org). Check with `node -v`. |
| All native builds | [Rust](https://rustup.rs). On Windows choose the default MSVC toolchain. Check with `rustc -V` (1.85 or later). |
| Windows | [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **Desktop development with C++** workload. WebView2 is already part of Windows 10 and 11. |
| macOS | Xcode, or at least the Command Line Tools: `xcode-select --install` |
| Linux (optional) | `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev librsvg2-dev build-essential` |
| Android | [Android Studio](https://developer.android.com/studio). In **SDK Manager** install an Android SDK Platform, **Android SDK Command-line Tools** and **NDK (Side by side)**. |
| iOS | A Mac with Xcode 16 or later, CocoaPods (`brew install cocoapods`), and an Apple ID or Apple Developer account. |

Full official checklist: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## 2. Install and add your license key

```powershell
cd D:\Analysis\PDFrig\SyncfusionPdfEditor-Tauri
npm install
copy .env.example .env
```

- Run `npm install` **before any other command**. It downloads TypeScript, Vite, the Tauri CLI and the Syncfusion packages into `node_modules`, and it copies the PDF engine into `public/ej2-pdfviewer-lib`. It takes 1–3 minutes the first time.
- Paste your Syncfusion key (JavaScript platform, version 35.x) into `.env`:

  ```
  VITE_SYNCFUSION_LICENSE=your-key-here
  ```

  The [free Community License](https://www.syncfusion.com/products/communitylicense) works. Without a key, a trial banner shows across the top.

## 3. Web

```powershell
npm run dev        # http://127.0.0.1:5173 with hot reload
npm run build      # production build in dist/
npm run preview    # test the production build at http://127.0.0.1:4173
```

To deploy, upload `dist/` to any static host. Make sure the host serves `.wasm` files as `application/wasm`.

## 4. Desktop: Windows (and macOS / Linux)

**Run the app during development:**

```powershell
npm run desktop:dev
```

The first run compiles the Rust shell, which takes 3–5 minutes. Later runs take seconds. A desktop window opens with the sample PDF, and the header chip shows **Desktop**.

**Build installers:**

```powershell
npm run desktop:build
```

Output in `src-tauri\target\release\bundle\`:

| OS | Files |
|---|---|
| Windows | `nsis\Syncfusion PDF Editor_0.1.0_x64-setup.exe`, `msi\Syncfusion PDF Editor_0.1.0_x64_en-US.msi` |
| macOS | `macos\Syncfusion PDF Editor.app`, `dmg\Syncfusion PDF Editor_0.1.0_aarch64.dmg` (or `_x64`) |
| Linux | `deb\`, `rpm\`, `appimage\` |

To check the file association, install the app, right-click any PDF and choose **Open with → Syncfusion PDF Editor**.

> The builds are **unsigned**. Windows SmartScreen and macOS Gatekeeper will warn when you open them. For release, sign Windows builds with a code-signing certificate, and sign and notarize macOS builds with an Apple Developer ID. See [Tauri distribution](https://v2.tauri.app/distribute/).

## 5. Desktop: build each OS on its own machine

Tauri builds for the OS it runs on. Build the Windows installer on Windows and the macOS `.dmg` on a Mac. A CI service such as GitHub Actions with [tauri-action](https://github.com/tauri-apps/tauri-action) can build all three automatically.

## 6. Mobile: Android

**One-time setup** (PowerShell; adjust the paths to your machine):

```powershell
# Android Studio's bundled Java and the SDK/NDK it installed
$env:JAVA_HOME    = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME     = "$env:ANDROID_HOME\ndk\<version>"

rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

npm run android:init          # creates src-tauri\gen\android
```

**Run on an emulator or a USB-connected phone:**

```powershell
npm run android:dev
```

**Build an APK:**

```powershell
npm run android:build
```

The APK is in `src-tauri\gen\android\app\build\outputs\apk\universal\release\`. It is unsigned: sign it before installing on other phones, or run `npx tauri android build --apk --debug` for a quick test build. For Google Play, build an app bundle with `npx tauri android build --aab`. See [Android code signing](https://v2.tauri.app/distribute/sign/android/).

## 7. Mobile: iOS (Mac only)

```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
npm run ios:init              # creates src-tauri/gen/apple
npm run ios:dev               # simulator or connected iPhone
npm run ios:build             # release build (.ipa)
```

Before running on a device, open `src-tauri/gen/apple/*.xcodeproj` in Xcode, select the app target, and under **Signing & Capabilities** choose your Team. For TestFlight and the App Store you need an Apple Developer account. See [iOS code signing](https://v2.tauri.app/distribute/sign/ios/).

## 8. All scripts

| Command | What it does |
|---|---|
| `npm run dev` | Web dev server with hot reload |
| `npm run build` | Type-check and build the web app into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run desktop:dev` | Run the Tauri desktop app (hot reload) |
| `npm run desktop:build` | Desktop installers for the current OS |
| `npm run android:init` / `android:dev` / `android:build` | Create, run and build the Android app |
| `npm run ios:init` / `ios:dev` / `ios:build` | Create, run and build the iOS app (Mac only) |

## 9. How it works

- **One UI.** `src/App.tsx` is the whole app. On phones the PDF Viewer switches to its built-in mobile toolbar automatically.
- **Works offline.** The PDFium WebAssembly engine is bundled into the app, and `resourceUrl` points to it.
- **Same document loading everywhere.** Documents are passed to the viewer as base64, so the same code works on `http(s)://` (web), `tauri://localhost` (macOS, iOS, Linux) and `http://tauri.localhost` (Windows, Android).
- **Opening from the OS.** `src-tauri/src/lib.rs` reads a PDF passed on the command line (Windows and Linux "Open with"). It also forwards the macOS and iOS "Open with" event. The web app picks these up in `src/native.ts`.
- **Saving.** In Tauri, the viewer's Download is intercepted (`downloadStart`). The edited PDF comes from `saveAsBlob()`, the official `dialog` plugin shows Save As, and the official `fs` plugin writes the file. Only the file the user picks is writable (`capabilities/default.json`).
- **Exporting annotations.** In a browser the viewer downloads the `.json` / `.xfdf` file itself, and the `exportSuccess` event shows "Annotations exported". The app WebViews ignore the viewer's download link, and on iOS nothing happens at all. So the app handles `exportStart` instead: it cancels the viewer's export, reads the data with `exportAnnotationsAsBase64String()`, saves it with the native Save As dialog (the **Save to Files** sheet on iOS), and shows the message.
- **Saving on iOS.** On iOS, the dialog plugin's Save As only returns a location the app can't write to. So on iOS, `saveFile()` in `src/native.ts` hands the finished file to the **Save to Files** sheet (the `save_file` command in `plugins/native-print`). This covers both the edited PDF and exported annotations.
- **Organize Pages on phones.** The app keeps `enableDesktopMode` on for the editor toolbars. On a phone that would squeeze the desktop organizer (overlapping toolbar, no room for the Save buttons). `openOrganizer()` in `src/viewer-modes.ts` therefore switches the viewer to its mobile organizer while the organizer is open: an icon toolbar, with **Save** and **Save As** in the **⋮** menu. It also hides the bottom tabs, then switches back when the organizer closes.
- **Printing.** See the next section.
- **Content Security Policy** in `tauri.conf.json` allows only the app's own files, WebAssembly, and the theme's Google font.

### Printing

The PDF Viewer prints by turning pages into images and calling `window.print()`. What happens next depends on the platform:

| Platform | What the user sees | How |
|---|---|---|
| Web (any browser) | Browser print preview | Viewer's own print (`window.print()`) |
| Windows | Edge print preview → Windows printers | Viewer's own print. WebView2 handles `window.print()` |
| Linux | GTK print dialog | Viewer's own print. WebKitGTK handles `window.print()` |
| **macOS** | Standard macOS Print panel | `plugins/native-print`: PDFKit `printOperation` |
| **iPhone / iPad** | AirPrint sheet (a popover on iPad) | `plugins/native-print`: `UIPrintInteractionController` |
| **Android** | System print screen (printers, **Save as PDF**) | `plugins/native-print`: `PrintManager` |

On macOS, iOS and Android, `window.print()` doesn't open a print screen in the system WebView. The app handles this in the `printStart` event:

1. Cancel the viewer's print (`args.cancel = true`).
2. Get the edited PDF with `saveAsBlob()`. It includes annotations, form data and page changes.
3. Send the bytes to `plugin:native-print|print_pdf`. The plugin writes them to the app's private cache folder and opens the OS print screen.

The real PDF is printed, not page images, so the text stays sharp.

Code: `onPrintStart` in `src/App.tsx`, `printPdf` in `src/native.ts`, and the plugin in `src-tauri/plugins/native-print`. Permission: `native-print:default` in `capabilities/default.json`.

**Test checklist**

| Platform | Steps | Expected |
|---|---|---|
| macOS | `npm run desktop:dev` → open a PDF → add a comment → **Print** | macOS Print panel opens; the preview shows the comment. Cancel shows "Printing cancelled" |
| iPhone | `npm run ios:dev` → **More → Print** | AirPrint sheet slides up. Use **Save to Files** (or a printer) to check the output |
| iPad | `npm run ios:dev` on an iPad (or the iPad simulator) → **Print** | AirPrint sheet opens as a popover in the middle of the screen |
| Android | `npm run android:dev` → **More → Print** | System print screen opens. Choose **Save as PDF** and check the saved file |
| Windows / Linux | `npm run desktop:dev` → **Print** | Same as before (no change) |
| iPhone / iPad: export annotations | Add a comment → open **Comments** → **⋮ → Export annotations** (JSON or XFDF) | **Save to Files** sheet opens. After saving, the message "Annotations exported to sample.json" shows |
| iPhone / iPad: Export PDF | Top bar **Export** | **Save to Files** sheet opens; the saved PDF opens in Files with your edits |
| iPhone / Android: Organize Pages | Bottom tab **Pages** | Full-height organizer with an icon toolbar. **⋮** has Save and Save As. The bottom tabs come back after closing |
| Web: export annotations | Same as above in a browser | File downloads, and the message "Annotations exported (sample.json)" shows |

Simulators have no real printers. On iOS use the **Printer Simulator** (Xcode → Open Developer Tool), and on Android use **Save as PDF**.

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `'tsc' is not recognized` or `'vite' is not recognized` | Packages aren't installed. Run `npm install` in the project folder, then run the command again. |
| `npm install` fails with `ETIMEDOUT`, `ECONNRESET` or a certificate error | Usually a company proxy. Run `npm config set proxy http://proxy:port` and `npm config set https-proxy http://proxy:port`, then `npm install` again. |
| `failed to run 'cargo metadata' ... program not found` | Rust isn't installed, or this terminal can't see it. Install the [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (**Desktop development with C++**) and [Rust](https://rustup.rs) (`winget install --id Rustlang.Rustup`), then **close all terminals and open a new one**. Check with `cargo -V`. If it's still not found, add `%USERPROFILE%\.cargo\bin` to your user PATH. |
| `'tauri' is not recognized` | Run it through npm (`npm run desktop:dev`), not as a bare `tauri` command, and make sure `npm install` finished. |
| `npm run desktop:dev` fails with a linker or `link.exe` error on Windows | Install Microsoft C++ Build Tools with **Desktop development with C++**, then open a new terminal. |
| `cargo` not found | Install Rust from rustup.rs and open a new terminal. |
| Blank viewer | Run `npm install` again, or `node scripts/copy-viewer-assets.mjs`, and check that `public/ej2-pdfviewer-lib/` has `pdfium.js` and `pdfium.wasm`. |
| Trial banner | Add `VITE_SYNCFUSION_LICENSE` to `.env`, then rebuild. |
| Android: "NDK not found" or "ANDROID_HOME not set" | Install the NDK in Android Studio's SDK Manager, and set `ANDROID_HOME` and `NDK_HOME` as in step 6. |
| Android: Save As shows but the file doesn't appear | Check the folder you picked in the Files app. Android save locations use content URIs; test on a real phone. |
| iOS: **Export annotations** does nothing | Rebuild the iOS app (`npm run ios:dev`); the native code changed. Then open Safari → **Develop** → your iPhone or Simulator → the app → **Console**, and try again. The app logs `[export] 1/3`, `2/3` and `3/3`; the last line shown is where it stopped, and `[export] failed:` gives the reason. |
| macOS, iOS, Android: **Print** does nothing | Check the browser console for `[native] Could not check native printing`. Make sure `native-print:default` is in `capabilities/default.json`, then rebuild. Re-run `android:init` / `ios:init` after adding the plugin the first time. |
| Android: "No print services" or no printers | Android always offers **Save as PDF**. For a real printer, install the printer maker's print service (or *Default Print Service*) from Google Play. |
| macOS: "app is damaged" or can't be opened | The build is unsigned. Right-click the app, choose **Open**, or sign and notarize it. |
| Fonts look slightly different offline | The theme loads Inter from Google Fonts and falls back to the system font offline. To bundle it, run `npm i @fontsource/inter` and add `import '@fontsource/inter'` in `src/main.tsx`, then remove the Google Fonts entries from the CSP. |

## 11. Notes

- **Telemetry.** Set `VITE_DISABLE_TELEMETRY=true` in `.env` to turn off Syncfusion's anonymous component-usage telemetry in development builds. Documents are never sent.
- **Versions used:** Syncfusion PDF Viewer 35.1.40, React 19.2, Vite 8.3, Tauri 2.12 (CLI 2.12.2, dialog plugin 2.8.2, fs plugin 2.7.0), local native-print plugin 0.1.0.
- **Not yet in this sample:**
  - Opening PDFs from other apps on Android and iOS (the mobile file association). That needs intent filters and document types in the generated mobile projects.
  - Single-instance behaviour on Windows. Each double-click opens a new window; the `tauri-plugin-single-instance` plugin would fix this.
