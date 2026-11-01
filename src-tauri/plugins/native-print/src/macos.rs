use std::path::Path;

use objc2::MainThreadMarker;
use objc2_app_kit::NSPrintInfo;
use objc2_foundation::{NSString, NSURL};
use objc2_pdf_kit::{PDFDocument, PDFPrintScalingMode};

/// Prints the PDF with the macOS print panel.
pub fn print_pdf(path: &Path) -> Result<bool, String> {
    let Some(mtm) = MainThreadMarker::new() else {
        return Err("Printing has to run on the main thread".to_string());
    };

    unsafe {
        let url = NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()));
        let Some(document) = PDFDocument::initWithURL(&url) else {
            return Err("Could not open the document for printing".to_string());
        };

        let print_info = NSPrintInfo::sharedPrintInfo();
        let Some(operation) = document.printOperationForPrintInfo_scalingMode_autoRotate(
            Some(&print_info),
            PDFPrintScalingMode::PageScaleNone,
            false,
            mtm,
        ) else {
            return Err("Could not create the print operation".to_string());
        };

        operation.setShowsPrintPanel(true);
        operation.setShowsProgressPanel(true);

        Ok(operation.runOperation())
    }
}
