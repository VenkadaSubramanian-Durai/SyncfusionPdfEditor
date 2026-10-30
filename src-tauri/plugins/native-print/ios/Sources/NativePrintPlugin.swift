// iOS / iPadOS: print the PDF with the standard AirPrint sheet, and save files
// (edited PDF, exported annotations) with the system "Save to Files" sheet.
import SwiftRs
import Tauri
import UIKit
import WebKit

class PrintArgs: Decodable {
  let path: String
  let name: String?
}

class ExportArgs: Decodable {
  let path: String
}

/// Resolves the invoke when the "Save to Files" sheet closes.
class ExportDelegate: NSObject, UIDocumentPickerDelegate {
  let invoke: Invoke
  let done: () -> Void
  init(_ invoke: Invoke, done: @escaping () -> Void) {
    self.invoke = invoke
    self.done = done
  }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    invoke.resolve(["saved": true])
    done()
  }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    invoke.resolve(["saved": false])
    done()
  }
}

class NativePrintPlugin: Plugin {
  // The picker holds its delegate weakly; keep it alive until the sheet closes.
  private var exportDelegate: ExportDelegate?

  /// Shows "Save to Files" for a finished file; iOS copies it to the folder the user picks.
  @objc public func exportFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ExportArgs.self)
    let url = URL(fileURLWithPath: args.path)
    DispatchQueue.main.async {
      guard let presenter = self.manager.viewController else {
        invoke.reject("No window to show the Save sheet.")
        return
      }
      let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
      let delegate = ExportDelegate(invoke) { [weak self] in self?.exportDelegate = nil }
      self.exportDelegate = delegate
      picker.delegate = delegate
      picker.modalPresentationStyle = .formSheet
      presenter.present(picker, animated: true)
    }
  }

  @objc public func printPdf(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(PrintArgs.self)
    let url = URL(fileURLWithPath: args.path)

    DispatchQueue.main.async {
      guard UIPrintInteractionController.isPrintingAvailable else {
        invoke.reject("Printing is not available on this device.")
        return
      }
      guard UIPrintInteractionController.canPrint(url) else {
        invoke.reject("This PDF cannot be printed.")
        return
      }

      let info = UIPrintInfo(dictionary: nil)
      info.outputType = .general
      info.jobName = args.name ?? url.lastPathComponent

      let controller = UIPrintInteractionController.shared
      controller.printInfo = info
      controller.printingItem = url

      let done: UIPrintInteractionController.CompletionHandler = { _, completed, error in
        if let error = error {
          invoke.reject(error.localizedDescription)
        } else {
          invoke.resolve(["printed": completed])
        }
      }

      // iPad shows the sheet as a popover, which needs an anchor.
      if UIDevice.current.userInterfaceIdiom == .pad, let view = self.manager.viewController?.view {
        let anchor = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        controller.present(from: anchor, in: view, animated: true, completionHandler: done)
      } else {
        controller.present(animated: true, completionHandler: done)
      }
    }
  }
}

@_cdecl("init_plugin_native_print")
public func initPlugin() -> Plugin {
  return NativePrintPlugin()
}
