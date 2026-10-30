//! macOS: open the PDF with PDFKit and show the standard Print panel
//! (printer, copies, pages, paper size, "Save as PDF").

use objc2::{AnyThread, MainThreadMarker};
use objc2_app_kit::NSPrintInfo;
use objc2_foundation::{NSString, NSURL};
use objc2_pdf_kit::{PDFDocument, PDFPrintScalingMode};
use std::path::PathBuf;
use std::sync::mpsc;
use tauri::{AppHandle, Runtime};

pub async fn print<R: Runtime>(app: &AppHandle<R>, path: PathBuf, name: String) -> Result<bool, String> {
    let (tx, rx) = mpsc::channel();
    // AppKit UI must run on the main thread.
    app.run_on_main_thread(move || {
        let _ = tx.send(print_on_main_thread(&path, &name));
    })
    .map_err(|e| e.to_string())?;
    // The print panel is modal; wait for it without blocking the async runtime.
    tauri::async_runtime::spawn_blocking(move || rx.recv())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|_| "The print panel closed unexpectedly.".to_string())?
}

fn print_on_main_thread(path: &std::path::Path, name: &str) -> Result<bool, String> {
    let mtm = MainThreadMarker::new().ok_or("Printing must run on the main thread.")?;
    let url = NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()));
    // SAFETY: plain PDFKit calls with valid, retained objects, made on the main thread.
    unsafe {
        let document = PDFDocument::initWithURL(PDFDocument::alloc(), &url)
            .ok_or("macOS could not open the PDF for printing.")?;
        let info = NSPrintInfo::sharedPrintInfo();
        let operation = document
            .printOperationForPrintInfo_scalingMode_autoRotate(
                Some(&info),
                PDFPrintScalingMode::PageScaleDownToFit,
                true,
                mtm,
            )
            .ok_or("macOS could not create a print job for this PDF.")?;
        operation.setJobTitle(Some(&NSString::from_str(name)));
        operation.setShowsPrintPanel(true);
        operation.setShowsProgressPanel(true);
        // Shows the Print panel; returns false when the user presses Cancel.
        Ok(operation.runOperation())
    }
}
