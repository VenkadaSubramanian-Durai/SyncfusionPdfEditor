// Android: print the PDF with the system print screen (PrintManager).
// The screen lists installed print services and always offers "Save as PDF".
package com.plugin.native_print

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

@InvokeArg
class PrintArgs {
    lateinit var path: String
    var name: String? = null
}

@TauriPlugin
class NativePrintPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun printPdf(invoke: Invoke) {
        val args = invoke.parseArgs(PrintArgs::class.java)
        val file = File(args.path)
        if (!file.exists()) {
            invoke.reject("The PDF to print was not found.")
            return
        }
        val jobName = args.name ?: file.name

        activity.runOnUiThread {
            try {
                val printManager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
                printManager.print(jobName, PdfFileAdapter(file, jobName), PrintAttributes.Builder().build())
                // The system print screen is now open; Android does not report when it closes.
                val result = JSObject()
                result.put("printed", true)
                invoke.resolve(result)
            } catch (e: Exception) {
                invoke.reject("Could not open the print screen: ${e.message}", e)
            }
        }
    }
}

/** Streams an existing PDF file to the print framework, unchanged. */
private class PdfFileAdapter(private val file: File, private val jobName: String) : PrintDocumentAdapter() {

    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes,
        cancellationSignal: CancellationSignal,
        callback: LayoutResultCallback,
        extras: Bundle?
    ) {
        if (cancellationSignal.isCanceled) {
            callback.onLayoutCancelled()
            return
        }
        val info = PrintDocumentInfo.Builder(jobName)
            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
            .build()
        callback.onLayoutFinished(info, oldAttributes != newAttributes)
    }

    override fun onWrite(
        pages: Array<out PageRange>,
        destination: ParcelFileDescriptor,
        cancellationSignal: CancellationSignal,
        callback: WriteResultCallback
    ) {
        try {
            FileInputStream(file).use { input ->
                FileOutputStream(destination.fileDescriptor).use { output ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        if (cancellationSignal.isCanceled) {
                            callback.onWriteCancelled()
                            return
                        }
                        val read = input.read(buffer)
                        if (read < 0) break
                        output.write(buffer, 0, read)
                    }
                }
            }
            callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
        } catch (e: Exception) {
            callback.onWriteFailed(e.message)
        }
    }
}
