import Foundation
import UIKit
import Tauri

/**
 * Bridges the native print and file picker APIs into the Tauri plugin.
 *
 * The plugin calls into this class from `mobile.rs` through
 * `TauriPlugin.run_mobile_plugin`.
 */
public class NativePrintPlugin: Plugin {

    public override func load(_ webview: Tauri.WebView) {
        super.load(webview)
    }

    @objc public func printPdf(payload: JsObject) -> Bool {
        guard let path = payload["path"] as? String else {
            return false
        }
        let name = (payload["name"] as? String) ?? "document"

        let url = URL(fileURLWithPath: path)
        guard FileManager.default.fileExists(atPath: url.path) else {
            return false
        }

        guard let controller = UIPrintInteractionController.shared else {
            return false
        }
        let info = UIPrintInfo(dictionary: nil)
        info.jobName = name
        info.outputType = .general
        controller.printInfo = info
        controller.printingItem = url
        controller.present(animated: true, completionHandler: nil)
        return true
    }

    @objc public func exportFile(payload: JsObject) -> Bool {
        guard let path = payload["path"] as? String else {
            return false
        }

        let url = URL(fileURLWithPath: path)
        guard FileManager.default.fileExists(atPath: url.path) else {
            return false
        }

        let picker = UIDocumentPickerViewController(forExporting: [url])
        DispatchQueue.main.async {
            UIApplication.shared
                .keyWindow?
                .rootViewController?
                .present(picker, animated: true, completion: nil)
        }
        return true
    }
}

private extension UIApplication {
    var keyWindow: UIWindow? {
        connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })
    }
}