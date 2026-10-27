import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Mobile WebViews cannot download blob: URLs, so on Android/iOS the edited PDF
 * is written to the app's Documents folder and handed to the system share sheet
 * (Save to Files, Drive, email, ...).
 */
export async function saveAndSharePdf(blob: Blob, fileName: string): Promise<void> {
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const written = await Filesystem.writeFile({
    path: safeName,
    data: await toBase64(blob),
    directory: Directory.Documents,
    recursive: true,
  });
  await Share.share({ title: safeName, url: written.uri, dialogTitle: 'Save or share PDF' });
}
