# Syncfusion PDF Editor — End-to-End Specification

Version: 1.0 (2026-10-30) · Owner: PDF Viewer team · Status: living document

Project: `D:\Analysis\PDFrig\SyncfusionPdfEditor-Tauri`

---

## 0. How to use this document (read first)

Rules for any person or AI model working from this spec:

| # | Rule |
|---|---|
| R1 | Follow the phases in order (§12). Do one step at a time. Run that step's check before the next step. |
| R2 | Do NOT install, add or recommend any npm, NuGet, Cargo or other third-party package. Use only the dependencies listed in §3. |
| R3 | Prefer Syncfusion PDF Viewer / PDF Comparer APIs. Then browser APIs. Then Tauri APIs from the installed plugins. Write custom code only when none of these covers the need. |
| R4 | Reuse existing files, types and helpers (§5, §9). Create a new file only if §16 lists it as "new". |
| R5 | Do NOT invent business rules. Where this spec says `TODO-xx` (register in §17), stop and ask the owner. Do not guess. |
| R6 | Do not change behaviour that is marked **Done** unless a step says so. |
| R7 | Keep UI text exactly as written in this spec (quoted strings). |
| R8 | Every change must keep these working: `npm run build` (type-check + web build) and `cargo check` in `src-tauri`. |
| R9 | No code in this document. Steps name files, APIs and expected results only. |

Status words used below:

- **Done** — built, and tested on Web and Linux desktop.
- **Done (untested)** — built, but not yet tested on the named platform.
- **Open** — not built.
- **TODO-xx** — needs a decision from the owner (§17).

---

## 1. Purpose and scope

### 1.1 Purpose

A free PDF editor app, published to promote Syncfusion PDF Viewer and the Syncfusion brand (requirement from the PDF Viewer team). It is built entirely on Syncfusion PDF Viewer for React, inspired by PDFrig, and ships from one codebase to six targets.

### 1.2 Targets

| Target | Shell | Engine | Status |
|---|---|---|---|
| Web | Browser | Browser | Done |
| Windows 10/11 | Tauri 2 | WebView2 (Edge) | Done (untested) |
| macOS 11+ | Tauri 2 | WKWebView | Done (untested) |
| Linux (x64) | Tauri 2 | WebKitGTK 4.1 | Done |
| Android 7+ (API 24+) | Tauri 2 | Android System WebView | Done (untested) |
| iOS / iPadOS 15+ | Tauri 2 | WKWebView | Done (untested) |

### 1.3 In scope

View, Annotate, Fill & Sign (forms and signatures, form designer), Redact, Organize pages, Compare two PDFs (semantic text compare), Search, Print, Export the edited PDF, Export and import annotations, Thumbnails, Comments panel, Dark mode (follows the OS), and opening PDFs from the OS.

### 1.4 Out of scope (decided)

| Item | Reason |
|---|---|
| Merge PDFs | Removed by the PDF Viewer team |
| Office to PDF | Removed by the PDF Viewer team |
| Recent files | Removed by the PDF Viewer team |
| Share button | Removed by the PDF Viewer team |
| Cloud storage, accounts, sign-in | Not requested. Documents never leave the device. |
| Server-side processing | The viewer runs fully client-side (PDFium WebAssembly) |
| Auto-update | Needs a new plugin, which is not allowed (R2). See TODO-08. |

---

## 2. Glossary

| Term | Meaning |
|---|---|
| Viewer | `PdfViewerComponent` from `@syncfusion/ej2-react-pdfviewer` |
| Comparer | `PdfComparerComponent` from the same package |
| Main toolbar | The viewer's built-in top toolbar (trimmed by the app) |
| Feature toolbar | The viewer's annotation, form designer or redaction toolbar |
| Rail | The app's left feature bar (desktop/tablet) or bottom tabs (phone) |
| Overlay | A screen or dialog drawn on top of the editor (start screen, Compare, organizer, More sheet) |
| Native print plugin | Local Tauri plugin `src-tauri/plugins/native-print` |
| Phone | Viewport width ≤ 640 px (CSS media query `(max-width: 640px)`) |
| Device | `Browser.isDevice` from `@syncfusion/ej2-base` is true (touch phone or tablet) |

---

## 3. Frozen dependencies (do not add or change)

### 3.1 JavaScript (`package.json`, all in devDependencies)

| Package | Version | Used for |
|---|---|---|
| @syncfusion/ej2-react-pdfviewer | 35.1.40 | Viewer and Comparer React components |
| @syncfusion/ej2-tailwind3-theme | 35.1.40 | Theme CSS (`styles/pdfviewer/index.css`) |
| @tauri-apps/api | 2.12.3 | `invoke`, `isTauri`, events |
| @tauri-apps/cli | 2.12.2 | Build, run and bundle |
| @tauri-apps/plugin-dialog | 2.8.2 | Save As dialog |
| @tauri-apps/plugin-fs | 2.7.0 | Write the chosen file |
| react, react-dom | 19.2.8 | UI |
| @types/react, @types/react-dom | 19.2.18 / 19.2.4 | Types |
| @vitejs/plugin-react | 6.1.2 | Build |
| typescript | 6.0.3 | Type-check |
| vite | 8.3.4 | Dev server and bundler |

### 3.2 Rust (`src-tauri/Cargo.toml` and `src-tauri/plugins/native-print/Cargo.toml`)

| Crate | Version | Used for |
|---|---|---|
| tauri | 2.12.x | Shell |
| tauri-build | 2.7.x | Build script |
| tauri-plugin-dialog | 2.8.x | Save As |
| tauri-plugin-fs | 2.7.x | File write |
| tauri-plugin (build) | 2.7.x | Native print plugin build |
| serde, serde_json | 1 | Command arguments |
| base64 | 0.22 | Startup file and plugin data |
| objc2 0.6, objc2-foundation 0.3, objc2-app-kit 0.3, objc2-pdf-kit 0.3 | — | macOS printing only |

### 3.3 Native (no extra packages)

- **Android** (Kotlin): `android.print.*`, plus the Tauri Android API that `tauri android init` creates.
- **iOS** (Swift): UIKit (`UIPrintInteractionController`, `UIDocumentPickerViewController`), plus the Tauri iOS API.

---

## 4. Architecture overview

```
React UI (src/)  ──props/events──▶  Syncfusion Viewer / Comparer (PDFium WASM, client-side)
     │
     └─ native.ts ──invoke──▶ Tauri core (src-tauri/src/lib.rs)
                              ├─ tauri-plugin-dialog  (Save As: Win/macOS/Linux/Android)
                              ├─ tauri-plugin-fs      (write chosen file)
                              └─ native-print plugin  (print: macOS/iOS/Android; save: iOS)
```

Principles:

1. One React codebase. Platform differences live only in `platform.ts`, `native.ts`, `viewer-modes.ts` and the native print plugin.
2. Documents are held in memory as base64 (`DocFile`). Nothing is uploaded.
3. The viewer's own toolbars do the editing. The app's UI only opens and closes them.
4. On web, everything uses the viewer's built-in behaviour. In Tauri, save, print and export are intercepted where the WebView cannot do them.

---

## 5. Folder structure

Generated, ignored or copied folders are marked (gen).

```
cross-platform-pdf-editor/
├─ docs/SPEC.md                         this file (new)
├─ README.md                            setup, scripts, troubleshooting, test checklist
├─ .env.example                         VITE_SYNCFUSION_LICENSE, VITE_DISABLE_TELEMETRY
├─ index.html, vite.config.ts, tsconfig.json, package.json, package-lock.json
├─ scripts/copy-viewer-assets.mjs       copies PDFium to public/ej2-pdfviewer-lib on npm install
├─ public/
│  ├─ sample.pdf                        3-page sample (text, floor plan, form)
│  ├─ sample-v2.pdf                     changed copy for the Compare sample pair
│  └─ ej2-pdfviewer-lib/ (gen)          pdfium.js, pdfium.wasm
├─ src/
│  ├─ main.tsx                          entry: license, theme CSS, styles, <App/>
│  ├─ license.ts                        registerLicense, Telemetry.disable
│  ├─ App.tsx                           screens, viewer config and events, all actions
│  ├─ viewer-modes.ts                   wrappers around viewer toolbar, panel and organizer APIs
│  ├─ native.ts                         Tauri bridge: open, save, print, features
│  ├─ platform.ts                       inTauri, getPlatform, asset URLs
│  ├─ styles.css                        tokens, layout, Syncfusion theme overrides
│  └─ ui/
│     ├─ TopBar.tsx                     home, file name, save state, Export
│     ├─ Rail.tsx                       desktop rail / phone bottom tabs
│     ├─ StartScreen.tsx                drop zone, Open, sample, task tiles, Continue
│     ├─ CompareView.tsx                two-document picker + PdfComparerComponent
│     └─ icons.tsx                      inline SVG icons for app UI
└─ src-tauri/
   ├─ tauri.conf.json                   app id, window, CSP, bundle, file associations
   ├─ capabilities/default.json         core, dialog:allow-save, fs:allow-write-file, native-print:default
   ├─ Cargo.toml, Cargo.lock, build.rs
   ├─ src/main.rs, src/lib.rs           startup file, Opened event, plugin registration
   ├─ icons/                            app icons (all sizes)
   ├─ gen/android/ (gen)                created by `npm run android:init`
   ├─ gen/apple/ (gen)                  created by `npm run ios:init`
   └─ plugins/native-print/
      ├─ Cargo.toml, build.rs
      ├─ src/lib.rs                     commands: features, is_supported, print_pdf, save_file
      ├─ src/macos.rs                   PDFKit print panel
      ├─ src/mobile.rs                  bridge to Kotlin/Swift
      ├─ permissions/                   default.toml + autogenerated
      ├─ android/src/main/java/NativePrintPlugin.kt
      └─ ios/Sources/NativePrintPlugin.swift
```

---

## 6. Component hierarchy

```
main.tsx
└─ App                                  (state owner; see §9.2)
   ├─ [no document]
   │  ├─ StartScreen                    (screen = start)
   │  └─ CompareView                    (screen = compare, openDocument = null)
   └─ [document open]  div.app.editor[.phone][.organizing]
      ├─ TopBar                         onHome, onExport
      ├─ div.workspace
      │  ├─ Rail (desktop)              items: View, Annotate, Fill & Sign, Redact | Organize, Compare | Pages
      │  └─ main.viewer-host            onClickCapture → syncFromViewer
      │     └─ PdfViewerComponent#pdf-viewer
      │        ├─ Inject: Toolbar, Magnification, Navigation, LinkAnnotation, BookmarkView,
      │        │          ThumbnailView, Print, TextSelection, TextSearch, Annotation,
      │        │          FormFields, FormDesigner, PageOrganizer
      │        └─ (viewer-owned) main toolbar, feature toolbars, thumbnails, comments, organizer dialog
      ├─ Rail (phone)                   items: View, Annotate, Sign, Pages(=Organize), More; hidden while organizing
      ├─ More sheet + backdrop (phone)  Redact, Compare, Thumbnails, Print
      ├─ CompareView (overlay)          openDocument = current doc
      │  ├─ Slot "Original" / Slot "Modified"
      │  └─ PdfComparerComponent        (result step)
      ├─ StartScreen in .start-overlay  continueWith = current doc name
      └─ Toast                          role=status, auto-hide 2.6 s
```

---

## 7. Navigation flow

### 7.1 Screens and overlays

| From | Action | To |
|---|---|---|
| App launch (no file) | — | Start |
| App launch with a PDF from the OS | — | Editor (file loaded) |
| Start | "Open PDF" / drop file / tile | Editor (+ the tile's task) |
| Start | "Try the sample" | Editor with sample.pdf |
| Start | Compare tile | Compare (setup) |
| Start (doc open) | "Continue editing <file>" | Editor (same doc, edits kept) |
| Editor | Home (TopBar mark) | Start overlay (editor stays mounted) |
| Editor | Rail Compare / More → Compare | Compare overlay (organizer and comments closed first) |
| Editor | Rail Organize / phone "Pages" | Organizer dialog (viewer) |
| Editor | Rail Pages / More → Thumbnails | Thumbnail pane toggle |
| Editor | Rail Annotate / Fill & Sign / Redact | Matching feature toolbar (one at a time) |
| Editor | Same rail item again | Toolbar closes → View |
| Compare setup | Both slots filled → "Compare" | Compare result |
| Compare result | "Change documents" | Compare setup |
| Compare | Close | Editor (doc open) or Start (no doc) |
| Organizer | ✕ / Save / Save As | Editor |
| OS "Open with" while running (macOS/iOS) | — | Editor with the new file |

### 7.2 Rules

- N1: Opening any rail item first closes the organizer (`closeOverlays`).
- N2: Only one feature toolbar is open at a time (`applyMode`).
- N3: If the viewer's own ✕ closes a toolbar, the rail updates within 150 ms (`syncFromViewer`).
- N4: Home and Compare never unmount the viewer while a document is open.

---

## 8. Data flow

| ID | Flow | Path |
|---|---|---|
| DF1 | Open file (web) | `File` → `fileBase64` → `DocFile` → `documentPath` (raw base64, no `data:` prefix) |
| DF2 | Open file (desktop, start-up) | OS args → Rust `take_startup_file` → `OpenedFile{name, base64}` → DF1 |
| DF3 | Open file (macOS/iOS, running) | `RunEvent::Opened` → event `open-file` → `onOpenFile` → DF1 |
| DF4 | Sample | `fetch(sampleDocumentUrl)` → base64 → DF1 |
| DF5 | Edit state | `annotationAdd` / `formFieldAdd` → saveState = "Edited · not saved yet" |
| DF6 | Export PDF (web) | Viewer `download()` → browser download |
| DF7 | Export PDF (Tauri) | `downloadStart` cancel → `saveAsBlob()` → `savePdf` → `saveFile` → (iOS: plugin `save_file`; others: dialog `save` + fs `writeFile`) → toast "Saved <name>", saveState "Copy saved · original unchanged" |
| DF8 | Print (web, Windows, Linux) | Viewer `print.print()` → `window.print()` → OS dialog |
| DF9 | Print (macOS, iOS, Android) | `printStart` cancel → `saveAsBlob()` → `printPdf` → plugin `print_pdf {name, data(base64)}` → OS print screen → toast |
| DF10 | Export annotations (web) | Viewer download → `exportSuccess` → toast "Annotations exported (<file>)" |
| DF11 | Export annotations (Tauri) | `exportStart` cancel → `exportAnnotationsAsBase64String(Json/Xfdf)` → bytes → `saveFile` → toast "Annotations exported to <file>" |
| DF12 | Export failure | `exportFailed` or a caught error → toast "Could not export annotations: <reason>" |
| DF13 | Import annotations | Viewer comment panel menu (built-in file input) — no app code |
| DF14 | Compare | Two `DocFile` → Comparer `originalDocumentPath` / `modifiedDocumentPath` (base64) |
| DF15 | Theme | `prefers-color-scheme` → `body.e-dark-mode` |
| DF16 | License | `.env` `VITE_SYNCFUSION_LICENSE` → `registerLicense` at start-up |

---

## 9. Data models

All of these already exist. Reuse them; do not duplicate them.

### 9.1 Types

| Type | File | Shape | Notes |
|---|---|---|---|
| `DocFile` | ui/CompareView.tsx | `{ name: string; base64: string }` | Used for every open document |
| `OpenedFile` | native.ts | `{ name: string; base64: string }` | Same shape as DocFile; from Rust |
| `EditMode` | viewer-modes.ts | `'view' \| 'annotate' \| 'sign' \| 'redact'` | One feature toolbar at a time |
| `RailItem` | ui/Rail.tsx | `'view' \| 'annotate' \| 'sign' \| 'redact' \| 'organize' \| 'compare' \| 'pages' \| 'more'` | |
| `StartTask` | ui/StartScreen.tsx | `'view' \| 'annotate' \| 'sign' \| 'organize' \| 'redact' \| 'compare'` | Applied after load |
| `Screen` | App.tsx | `'start' \| 'editor' \| 'compare'` | |
| `AppPlatform` | platform.ts | `'web' \| 'desktop' \| 'android' \| 'ios'` | iPadOS reports 'desktop' (Mac UA) |
| `NativeFeatures` | native.ts | `{ print: boolean; saveFile: boolean }` | From plugin `features` |
| `ToolbarItemList` | viewer-modes.ts | viewer `showToolbarItem` arg | |

### 9.2 App state (App.tsx)

| State | Type | Default | Purpose |
|---|---|---|---|
| screen | Screen | 'start' | Current screen |
| doc | DocFile \| null | null | Open document |
| mode | EditMode | 'view' | Open feature toolbar |
| thumbsOpen | boolean | false | Thumbnail pane |
| organizing | boolean | false | Organizer open (phone hides bottom tabs) |
| moreOpen | boolean | false | Phone More sheet |
| saveState | string | "Saved on this device" | TopBar subtitle |
| toast | string | '' | Message; clears after 2.6 s |
| pendingTask (ref) | StartTask \| null | null | Task to apply on documentLoad |
| exportingNatively (ref) | boolean | false | Stops export events from looping back into the handlers |

### 9.3 Native commands (contract)

| Command | Args | Returns | Platforms |
|---|---|---|---|
| `take_startup_file` | — | `OpenedFile \| null` | Desktop |
| event `open-file` | payload `OpenedFile` | — | macOS, iOS |
| `plugin:native-print\|features` | — | `NativeFeatures` | All Tauri |
| `plugin:native-print\|is_supported` | — | boolean | All Tauri (legacy; keep) |
| `plugin:native-print\|print_pdf` | `{ name, data }` (base64 PDF) | boolean printed | macOS, iOS, Android |
| `plugin:native-print\|save_file` | `{ name, data }` (base64 any) | boolean saved | iOS |
| Swift `printPdf` / Kotlin `printPdf` | `{ path, name }` | `{ printed }` | iOS / Android |
| Swift `exportFile` | `{ path }` | `{ saved }` | iOS |

Temp files go in the app cache dir, in `print/` and `export/`. Each folder is cleared at the start of the next call.

### 9.4 Viewer configuration (fixed)

| Prop | Value |
|---|---|
| id | "pdf-viewer" |
| resourceUrl | `viewerResourceUrl` (platform.ts) |
| documentPath | `doc.base64` |
| downloadFileName | `doc.name` |
| exportAnnotationFileName | base name of `doc.name` |
| toolbarSettings.toolbarItems | OpenOption, UndoRedoTool, PageNavigationTool, MagnificationTool, PanTool, SelectionTool, CommentTool, SearchOption, AnnotationEditTool, FormDesignerEditTool, RedactionEditTool, OrganizePagesTool, PrintOption, DownloadOption |
| hidden after load | AnnotationEditTool, FormDesignerEditTool, RedactionEditTool, OrganizePagesTool, DownloadOption |
| enablePageOrganizer / enableFormDesigner | true / true |
| enableNavigationToolbar | false |
| events | documentLoad, annotationAdd, formFieldAdd, downloadStart, printStart, exportStart, exportSuccess, exportFailed |

---

## 10. Functional requirements

Format for each feature: **API** used · **Platform notes** · **AC** (acceptance criteria, all must pass) · **Edge** (edge cases and the required result).

### FR-START — Start screen (Done)

- API: browser `File`, drag-and-drop, `<input type=file accept=.pdf>`.
- AC1: The screen shows a drop zone, "Open PDF", "Try the sample", and the tiles Annotate, Fill & Sign, Organize, Redact, Compare.
- AC2: Choosing a tile then a file opens the editor with that task applied after `documentLoad`.
- AC3: When a document is open, "Continue editing <file>" returns to the editor with all edits kept.
- Edge: a non-PDF file → the viewer shows its own load error and the app stays on the editor. TODO-11: decide whether to block non-PDFs before loading.

### FR-VIEW — View (Done)

- API: main toolbar (page navigation, zoom, pan/select, search, comments, print, open), `magnification`, `navigation`.
- AC1: The main toolbar shows only the items in §9.4 minus the hidden ones.
- AC2: The "View" rail item closes any open feature toolbar.
- Edge: a password-protected PDF → the viewer shows its built-in password dialog.

### FR-ANNOT — Annotate (Done)

- API: `toolbar.showAnnotationToolbar(true|false)`, `annotationModule`.
- AC1: Rail "Annotate" opens the viewer's annotation toolbar; selecting it again closes it.
- AC2: Closing with the viewer's ✕ updates the rail to View (N3).
- AC3: Adding an annotation sets saveState to "Edited · not saved yet".

### FR-SIGN — Fill & Sign (Done)

- API: `FormFields`, `FormDesigner`, `formDesignerToolbarModule.showFormDesignerToolbar`.
- AC1: Rail "Fill & Sign" opens the form designer toolbar; form fields can be filled and a signature added.
- AC2: Adding a form field sets saveState to "Edited · not saved yet".

### FR-REDACT — Redact (Done)

- API: `toolbar.showRedactionToolbar(true|false)`.
- AC1: Rail "Redact" (desktop) or More → "Redact" (phone) opens the redaction toolbar.
- AC2: Redaction is applied only through the viewer's own Apply action.
- Edge: TODO-13: decide whether to show a warning before saving a document with redactions that are marked but not yet applied.

### FR-ORG — Organize pages (Done; phone layout untested on device)

- API: `pageOrganizer.openPageOrganizer`, `closePageOrganizer`, `isOrganizeWindowOpen`.
- AC1: Rail "Organize" / phone "Pages" opens the organizer dialog.
- AC2: On phones the bottom tabs are hidden while the organizer is open.
- AC3: Opening any other rail item, or Compare, closes the organizer first.
- AC4: Desktop shows the footer "Save As", "Save", "Total N Pages". Mobile shows "Save" and "Save As" in the ⋮ menu.
- Edge: the user switches app or screen while the organizer is open → it closes cleanly and desktop mode is restored.

### FR-THUMB — Thumbnails (Done)

- API: `thumbnailViewModule.openThumbnailPane` / `closeThumbnailPane`, `navigationPane.isThumbnailOpen`.
- AC1: Rail "Pages" / More → "Thumbnails" toggles the pane, and the rail state matches the pane after the viewer's own close.

### FR-COMMENTS — Comments panel (Done)

- API: viewer CommentTool, `annotationModule.showCommentsPanel`, `isCommandPanelOpen`.
- AC1: The panel opens from the main toolbar, and closes before Compare opens.

### FR-SEARCH — Search (Done)

- API: main toolbar SearchOption (`textSearch`).
- AC1: Searching "Syncfusion" in sample.pdf highlights its matches.

### FR-COMPARE — Compare two PDFs (Done)

- API: `PdfComparerComponent` with `originalDocumentPath`, `modifiedDocumentPath`, `resourceUrl`, `comparisonOptions` (`TextComparisonOptions`, red/green, opacity 0.35, highlights on), `enableDifferencePanel`, `enableSyncScrolling`.
- AC1: The setup step has two slots, "Original" and "Modified". Each slot supports drop, "Choose PDF" and Remove; the Original slot also offers "Use the open document" when a document is open.
- AC2: "Compare" stays disabled until both slots are filled. There is a swap button and a "Use the sample pair" link.
- AC3: The result step shows the file chips, "Change documents", the "Sync scrolling" toggle and the difference panel.
- Edge: the same file in both slots → the comparer shows no differences (allowed).
- Edge: large files on mobile → TODO-05 (size limit).

### FR-EXPORT — Export edited PDF (Done; iOS untested)

- AC1 (web): "Export" downloads `<doc.name>` with all edits.
- AC2 (Tauri): a native Save As opens (the "Save to Files" sheet on iOS); after saving, the toast "Saved <name>" shows and saveState is "Copy saved · original unchanged".
- AC3: The original file is never overwritten unless the user picks it in Save As.
- Edge: cancel → no toast and no state change.
- Edge: a write error → toast "Could not save the PDF".

### FR-PRINT — Print (Done; macOS/iOS/Android untested)

- AC1: Web, Windows and Linux use the viewer's print (`window.print()`).
- AC2: macOS, iOS and Android (`features.print = true`) cancel `printStart`, then send the edited PDF to `print_pdf`. Toasts: "Opening the print screen…", then "Sent <name> to print" or "Printing cancelled".
- AC3: iPad shows the print sheet as a popover in the middle of the screen.
- Edge: no printer → the OS screen handles it (Android always offers "Save as PDF").
- Edge: a plugin error → toast "Could not print: <reason>".

### FR-ANNOT-IO — Export / import annotations (Done; iOS untested)

- API: comment panel ⋮ menu ("Export Annotations", "Export XFDF", "Import Annotations", "Import XFDF"), `exportStart`, `exportSuccess`, `exportFailed`, `exportAnnotationsAsBase64String`.
- AC1 (web): the file downloads as `<base>.json` / `<base>.xfdf`, then the toast "Annotations exported (<file>)" shows.
- AC2 (Tauri): toasts follow the steps "Preparing annotations…" → "Choose where to save the annotations" → "Annotations exported to <file>" or "Export cancelled".
- AC3: Console logs `[export] 1/3`, `2/3`, `3/3`, or `[export] failed: <reason>`.
- AC4: Import uses the viewer's built-in file picker (no app code).
- Edge: no annotations → the viewer disables the menu item. If the data never arrives, a 20 s guard shows "Could not export annotations: the viewer returned no annotation data".

### FR-OPEN-OS — Open from the OS (Done desktop; mobile Open)

- AC1: Windows/Linux: launching with a `.pdf` path opens it.
- AC2: macOS: double-click or "Open with" opens it, both at start-up and while running.
- AC3: Android/iOS "Open with" → **Open**: needs Android intent filters and iOS document types in the generated projects (TODO-10).

### FR-THEME — Dark mode (Done)

- AC1: The OS dark setting switches the viewer (`e-dark-mode`) and app tokens without a reload.

### FR-LICENSE — License (Done)

- AC1: With `VITE_SYNCFUSION_LICENSE` set, no trial banner shows. Without it, the banner shows and the app still works.
- Release builds: TODO-07 (key source in CI).

---

## 11. Persistence

| Data | Where | Lifetime |
|---|---|---|
| Open document + edits | Memory (viewer + `doc` state) | Until app closes or another doc opens |
| Saved PDF / annotation files | User-chosen location via OS Save As / "Save to Files" | Permanent (user owns) |
| Print/export temp files | App cache dir `print/`, `export/` | Cleared on next use; OS may purge |
| App settings | None | — |
| Browser storage | Not used (viewer default `enableLocalStorage` unchanged) | — |

Rules:

- P1: Never write to a path the user did not choose. The only exception is the temp files in the app cache dir.
- P2: No recent-files list (§1.4).
- P3: TODO-14: decide whether to warn about unsaved edits on close or Home.

---

## 12. Implementation phases

Each step: **Files** · **Do** · **Check**. Steps marked Done only need their check re-run.

### Phase 1 — Setup

| Step | Files | Do | Check |
|---|---|---|---|
| 1.1 | — | Install Node.js 22 LTS (minimum 20.19) and Rust (rustup, stable ≥ 1.85). Windows also needs the C++ Build Tools ("Desktop development with C++"). | `node -v`, `cargo -V` |
| 1.2 | package.json | `npm install` (runs postinstall) | `public/ej2-pdfviewer-lib/pdfium.wasm` exists |
| 1.3 | .env | Copy .env.example → .env and set `VITE_SYNCFUSION_LICENSE` | No trial banner in `npm run dev` |
| 1.4 | — | `npm run build` | Exit 0 |
| 1.5 | src-tauri | `cargo check` | Exit 0 |

### Phase 2 — UI

| Step | Files | Do | Check |
|---|---|---|---|
| 2.1 | src/ui/TopBar.tsx | Keep: home, name, saveState, Export only (Done) | No Share, search or zoom in TopBar |
| 2.2 | src/ui/Rail.tsx | Keep the DESKTOP/PHONE lists from §6 (Done) | Labels always visible |
| 2.3 | src/ui/StartScreen.tsx | Keep per FR-START (Done) | AC1–AC3 |
| 2.4 | src/ui/CompareView.tsx | Keep per FR-COMPARE (Done) | AC1–AC3 |
| 2.5 | src/styles.css | Overlay z-index: start/compare 1000, toast 1100 | Toast visible above panels |
| 2.6 | — | TODO-01 branding (name, icons, colours) | Owner sign-off |

### Phase 3 — Business logic (viewer wiring)

| Step | Files | Do | Check |
|---|---|---|---|
| 3.1 | src/App.tsx | Viewer config exactly per §9.4 | Visual check |
| 3.2 | src/viewer-modes.ts | applyMode, currentMode, closeOverlays, openOrganizer per N1–N3 and FR-ORG | FR-ANNOT/SIGN/REDACT/ORG ACs |
| 3.3 | src/App.tsx | onExportStart / onExportSuccess / onExportFailed per FR-ANNOT-IO | AC1–AC3 |
| 3.4 | src/App.tsx | onPrintStart per FR-PRINT | AC1–AC2 |
| 3.5 | src/App.tsx | onDownloadStart per FR-EXPORT | AC1–AC3 |
| 3.6 | — | Business rules marked TODO (§17): do not implement until decided | — |

### Phase 4 — Persistence

| Step | Files | Do | Check |
|---|---|---|---|
| 4.1 | src/native.ts | `saveFile` routing: iOS → plugin `save_file`; others → dialog + fs | FR-EXPORT AC2 on each OS |
| 4.2 | src-tauri/capabilities/default.json | Exactly: core:default, dialog:allow-save, fs:allow-write-file, native-print:default | `cargo check` |
| 4.3 | — | TODO-14 unsaved-changes warning | Owner decision |

### Phase 5 — Platform integration

| Step | Files | Do | Check |
|---|---|---|---|
| 5.1 | src-tauri/src/lib.rs | Startup file + `RunEvent::Opened` (Done) | FR-OPEN-OS AC1–AC2 |
| 5.2 | src-tauri/plugins/native-print/* | Commands per §9.3 (Done) | `cargo test -p tauri-plugin-native-print` |
| 5.3 | src-tauri/tauri.conf.json | Identifier, version, CSP, fileAssociations (§13) | Bundle builds |
| 5.4 | gen/android AndroidManifest.xml | TODO-10: `ACTION_VIEW` intent filter for `application/pdf` | Android "Open with" lists app |
| 5.5 | gen/apple Info.plist | TODO-10: `CFBundleDocumentTypes` for `com.adobe.pdf` | iOS Files "Share → app" opens it |
| 5.6 | §13 per OS | Run each OS setup | App launches on each |

### Phase 6 — Testing

| Step | Do | Check |
|---|---|---|
| 6.1 | Web: Chrome, Edge, Firefox, Safari | §15 rows pass |
| 6.2 | Windows 11 (WebView2) | §15 rows pass |
| 6.3 | macOS (Apple silicon + Intel) | §15 rows pass |
| 6.4 | Linux (Ubuntu 22.04+) | §15 rows pass |
| 6.5 | Android phone + tablet (real device) | §15 rows pass |
| 6.6 | iPhone + iPad (real device; Simulator for Printer Simulator) | §15 rows pass |
| 6.7 | Large-file test (TODO-05 limits) | No crash; memory acceptable |
| 6.8 | Diagnostics on failure: Safari Web Inspector (iOS/macOS), `chrome://inspect` (Android), DevTools (Windows `tauri dev`) | Logs captured in the issue |

---

## 13. Tauri setup per OS

Common: `npm install` → `.env` → `npm run desktop:dev` (desktop) or the mobile init/dev commands. Edit only `src-tauri/tauri.conf.json` for shared settings. Generated mobile projects (`gen/`) are created once, then committed (TODO-15: commit policy).

### 13.1 Windows

- Tools: Node 20+, Rust stable (MSVC), Visual Studio C++ Build Tools ("Desktop development with C++"), WebView2 Runtime (preinstalled on Windows 11).
- Run: `npm run desktop:dev`.
- Build: `npm run desktop:build` → MSI (WiX) + NSIS `.exe` in `src-tauri/target/release/bundle/`.
- File association: from `bundle.fileAssociations` (.pdf, role Editor).
- Signing: Authenticode certificate (TODO-03). Configure `bundle.windows.certificateThumbprint`, `digestAlgorithm` "sha256" and `timestampUrl` in tauri.conf.json, or a `signCommand`. Unsigned builds trigger SmartScreen.

### 13.2 macOS

- Tools: Xcode Command Line Tools, Rust targets `aarch64-apple-darwin` and `x86_64-apple-darwin`.
- Run: `npm run desktop:dev`.
- Build: `npm run desktop:build` → `.app` and `.dmg`. Universal build: `npm run tauri build -- --target universal-apple-darwin`.
- Print: PDFKit panel through the native print plugin.
- Signing: "Developer ID Application" certificate. Environment: `APPLE_SIGNING_IDENTITY`. Notarization: `APPLE_ID` + `APPLE_PASSWORD` (app-specific) + `APPLE_TEAM_ID`, or `APPLE_API_KEY`/`APPLE_API_ISSUER`/`APPLE_API_KEY_PATH` (TODO-04).
- Mac App Store distribution: TODO-09.

### 13.3 Linux

- Tools: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev` (Debian/Ubuntu names).
- Build: `npm run desktop:build` → `.deb`, `.rpm`, `.AppImage`.
- Print: GTK print dialog (`window.print()`).
- Signing: optional AppImage GPG signature (`SIGN=1`, `SIGN_KEY`, `APPIMAGETOOL_SIGN_PASSPHRASE`). TODO-03.

### 13.4 Android

- Tools: Android Studio (SDK Platform 34+, Build-Tools, NDK, Command-line Tools), JDK 17 (Android Studio's bundled JBR). Set `JAVA_HOME`, `ANDROID_HOME` and `NDK_HOME`.
- Rust targets: `aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`.
- Init once: `npm run android:init` → `src-tauri/gen/android`. Re-run after adding a native plugin.
- Run: `npm run android:dev` (emulator or USB device).
- Build: `npm run android:build` (APK). Play Store: `npm run tauri android build -- --aab`.
- Print: PrintManager through the native print plugin. Save: dialog + fs (content URIs).
- Signing: upload keystore (TODO-06). Add `keystore.properties` (storeFile, storePassword, keyAlias, keyPassword) and a `signingConfigs.release` block in `gen/android/app/build.gradle.kts`. Never commit the keystore or its passwords.
- Open with: TODO-10.

### 13.5 iOS / iPadOS (Mac only)

- Tools: Xcode 15+, CocoaPods not required, Rust targets `aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`.
- Init once: `npm run ios:init` → `src-tauri/gen/apple`. Re-run after adding a native plugin.
- Run: `npm run ios:dev` (Simulator or device).
- Build: `npm run ios:build`. App Store: `npm run tauri ios build -- --export-method app-store-connect`.
- Print: AirPrint sheet. Save and annotation export: "Save to Files" sheet (plugin `save_file`).
- Signing: Apple Developer Team (TODO-04). Set `bundle.iOS.developmentTeam` in tauri.conf.json, or pick the Team in Xcode under Signing & Capabilities.
- Open with: TODO-10.

---

## 14. Build, packaging, signing and release

### 14.1 Versioning

- One version number, kept the same in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
- Format: SemVer `MAJOR.MINOR.PATCH`. Android `versionCode` and iOS build number come from it. TODO-16: build number scheme.

### 14.2 Artifacts

| OS | Artifact | Store / channel |
|---|---|---|
| Windows | MSI, NSIS exe | TODO-09 (website / Microsoft Store) |
| macOS | dmg (notarized) | TODO-09 (website / Mac App Store) |
| Linux | deb, rpm, AppImage | TODO-09 |
| Android | AAB (Play), APK (direct) | Google Play (TODO-09) |
| iOS | IPA | App Store (TODO-09) |
| Web | `dist/` static files | TODO-09 (hosting) |

### 14.3 Release checklist (each release)

1. Bump the version in all three files (§14.1).
2. `npm run build` and `cargo test -p tauri-plugin-native-print` pass.
3. §15 test matrix: every row passes on every target being released.
4. Release builds use the license key from TODO-07. No trial banner.
5. Set `VITE_DISABLE_TELEMETRY` per TODO-02.
6. Sign (and notarize on macOS) per §13.
7. Install the signed artifacts on clean machines/devices and smoke-test them.
8. Store metadata ready: name, description, screenshots, privacy policy URL, support URL (TODO-01, TODO-17).
9. Tag the release in source control.

---

## 15. Test matrix

✔ = tested and passing · ○ = not tested yet · — = not applicable.

| Feature | Web | Win | macOS | Linux | Android | iOS/iPadOS |
|---|---|---|---|---|---|---|
| Open / sample / OS open | ✔ | ○ | ○ | ✔ | ○ | ○ |
| View, search, thumbnails, comments | ✔ | ○ | ○ | ✔ | ○ | ○ |
| Annotate | ✔ | ○ | ○ | ✔ | ○ | ○ |
| Fill & Sign | ✔ | ○ | ○ | ✔ | ○ | ○ |
| Redact | ✔ | ○ | ○ | ✔ | ○ | ○ |
| Organize (desktop layout) | ✔ | ○ | ○ | ✔ | — | ○ (iPad) |
| Organize (mobile layout) | ✔ (emulated) | — | — | — | ○ | ○ |
| Compare | ✔ | ○ | ○ | ✔ | ○ | ○ |
| Export PDF | ✔ | ○ | ○ | ✔ | ○ | ○ |
| Print | ✔ | ✔ (seen by team) | ○ | ✔ | ○ | ○ |
| Export annotations + message | ✔ | ○ | ○ | ○ | ○ | ○ (reported failing; fix pending device test) |
| Import annotations | ○ | ○ | ○ | ○ | ○ | ○ |
| Dark mode | ✔ | ○ | ○ | ✔ | ○ | ○ |

---

## 16. Files

### 16.1 Files the spec itself adds

| File | Change |
|---|---|
| docs/SPEC.md | New (this file) |

### 16.2 Files that remaining work will modify

| File | Phase | Reason |
|---|---|---|
| src/App.tsx | 3, 4 | Unsaved-changes rule (TODO-14), non-PDF guard (TODO-11) |
| src/viewer-modes.ts | 3 | Only if mobile UI mode is resumed (TODO-12) |
| src/native.ts | 4 | Only if save routing changes |
| src/ui/StartScreen.tsx | 2 | Branding text (TODO-01) |
| src/ui/TopBar.tsx | 2 | Branding (TODO-01) |
| src/styles.css | 2 | Branding colours (TODO-01) |
| src/license.ts | 1 | Release key source (TODO-07) |
| .env.example | 1 | Document release variables |
| README.md | All | Keep in sync with this spec |
| src-tauri/tauri.conf.json | 5 | Final identifier, product name, signing fields, iOS team |
| src-tauri/Cargo.toml, package.json | Release | Version bumps |
| src-tauri/icons/* | 2 | Final icons (TODO-01) |
| src-tauri/gen/android/app/src/main/AndroidManifest.xml | 5 | Open-with intent filter (TODO-10) |
| src-tauri/gen/android/app/build.gradle.kts | 5 | Release signing (TODO-06) |
| src-tauri/gen/apple/*/Info.plist | 5 | Document types (TODO-10) |

No new source files are planned.

---

## 17. TODO register (owner decisions)

| ID | Decision needed | Blocks | Owner |
|---|---|---|---|
| TODO-01 | Final app name, bundle identifier (now `com.syncfusion.pdfeditor.sample`), icons, colours, store text | Release | TODO |
| TODO-02 | Syncfusion telemetry on/off in release builds | Release | TODO |
| TODO-03 | Windows code-signing certificate; Linux signing yes/no | Windows/Linux release | TODO |
| TODO-04 | Apple Developer account, Team ID, notarization credentials | macOS/iOS release | TODO |
| TODO-05 | Max PDF size and page count (esp. mobile, Compare) and the message shown when over the limit | FR-COMPARE, 6.7 | TODO |
| TODO-06 | Android keystore owner and storage | Android release | TODO |
| TODO-07 | How release builds get the Syncfusion license key (CI secret?) | Release | TODO |
| TODO-08 | Update strategy without new plugins (store updates only?) | Release | TODO |
| TODO-09 | Distribution channels per OS (website, Microsoft Store, Mac App Store, Play, App Store, web hosting URL) | Release | TODO |
| TODO-10 | Support "Open with" on Android/iOS | FR-OPEN-OS AC3 | TODO |
| TODO-11 | Block non-PDF files before loading, and the message to show | FR-START | TODO |
| TODO-12 | Phone UI: keep desktop mode or adopt the viewer's mobile mode (parked) | FR-ANNOT | TODO |
| TODO-13 | Warning for redactions marked but not applied before export | FR-REDACT | TODO |
| TODO-14 | Warn about unsaved edits on Home / close / opening another file | P3 | TODO |
| TODO-15 | Commit `src-tauri/gen/` to source control or regenerate in CI | §13 | TODO |
| TODO-16 | Build number scheme for Android versionCode / iOS build | §14.1 | TODO |
| TODO-17 | Privacy policy and support URLs; promotion links to Syncfusion inside the app | Release | TODO |
| TODO-18 | Localization (languages) | UI | TODO |
| TODO-19 | Accessibility target (e.g. WCAG 2.1 AA) and screen-reader testing | Testing | TODO |
| TODO-20 | Analytics of app usage (no package may be added; only if Syncfusion telemetry suffices) | Release | TODO |
