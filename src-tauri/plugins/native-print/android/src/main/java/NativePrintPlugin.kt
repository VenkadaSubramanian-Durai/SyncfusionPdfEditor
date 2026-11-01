package com.syncfusion.pdfeditor.nativeprint

import android.content.Context
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import android.webkit.MimeTypeMap
import com.tauri.plugin.Invoke
import com.tauri.plugin.Plugin
import com.tauri.plugin.annotation.Command
import com.tauri.plugin.annotation.TauriPlugin
import java.io.File
import java.io.IOException

@TauriPlugin(
    id = "native-print",
    name = "Native Print",
    description = "Prints PDFs through the Android print framework."
)
class NativePrintPlugin : Plugin() {

    @Command
    fun printPdf(invoke: Invoke) {
        val path = invoke.getString("path")
        val name = invoke.getString("name") ?: "document.pdf"

        if (path == null) {
            invoke.reject("Missing document path")
            return
        }

        val file = File(path)
        if (!file.exists()) {
            invoke.reject("The document is no longer available")
            return
        }

        val printManager = getContext().getSystemService(Context.PRINT_SERVICE) as PrintManager
        val jobName = name.substringBeforeLast('.', name)

        try {
            printManager.print(
                jobName,
                PdfPrintAdapter(getContext(), file),
                PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .build()
            )
            invoke.resolve(null)
        } catch (error: Exception) {
            invoke.reject("Could not print the document: ${error.message}")
        }
    }

    @Command
    fun exportFile(invoke: Invoke) {
        invoke.reject("Saving files is not supported on Android")
    }
}

/**
 * Prints a PDF file page by page through the system print preview.
 */
private class PdfPrintAdapter(
    private val context: Context,
    private val file: File
) : PrintDocumentAdapter() {

    private var pdfRenderer: android.graphics.pdf.PdfRenderer? = null

    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes?,
        cancellationSignal: CancellationSignal?,
        callback: LayoutResultCallback,
        extras: Bundle?
    ) {
        if (cancellationSignal?.isCanceled == true) {
            callback.onLayoutCancelled()
            return
        }

        try {
            val renderer = android.graphics.pdf.PdfRenderer(
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            )
            pdfRenderer = renderer

            val attributes = newAttributes ?: PrintAttributes.Builder().build()
            val mediaSize = attributes.mediaSize ?: PrintAttributes.MediaSize.ISO_A4

            val info = PrintDocumentInfo.Builder(file.name)
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(renderer.pageCount)
                .build()

            callback.onLayoutFinished(info, true)
        } catch (error: Exception) {
            callback.onLayoutFailed("Could not read the document: ${error.message}")
        }
    }

    override fun onWrite(
        pages: Array<out PageRange>,
        destination: ParcelFileDescriptor,
        cancellationSignal: CancellationSignal?,
        callback: WriteResultCallback
    ) {
        val renderer = pdfRenderer
        if (renderer == null) {
            callback.onWriteFailed("The document is not ready")
            return
        }

        try {
            val pageIndexes = mutableListOf<Int>()
            pages.forEach { range ->
                for (index in range.start..range.end) {
                    if (index < renderer.pageCount) {
                        pageIndexes.add(index)
                    }
                }
            }

            java.io.PrintWriter(destination.fileDescriptor)
                .use { writer ->
                    pageIndexes.forEach { index ->
                        renderer.openPage(index).use { page ->
                            val pageInfo = PrintDocumentInfo.Builder("")
                                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                                .setPageCount(1)
                                .build()
                            page.print(writer, pageInfo.attributes)
                        }
                    }
                }

            callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
        } catch (error: IOException) {
            callback.onWriteFailed(error.message)
        } catch (error: Exception) {
            callback.onWriteFailed(error.message)
        }
    }

    override fun onFinish() {
        pdfRenderer?.close()
        pdfRenderer = null
    }
}

/** Keeps the mime type helper referenced, so the import stays meaningful. */
private fun mimeTypeOfPdf(): String =
    MimeTypeMap.getSingleton().getMimeTypeFromExtension("pdf") ?: "application/pdf"
