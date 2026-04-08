import 'dart:html' as html;
import 'dart:typed_data';

Future<void> openPdfBytesImpl(Uint8List bytes, {required String filename}) async {
  final blob = html.Blob([bytes], 'application/pdf');
  final url = html.Url.createObjectUrlFromBlob(blob);
  try {
    // Open in new tab. User can print from browser.
    html.window.open(url, '_blank');
  } finally {
    // Give the browser a moment to start loading before revoking.
    Future<void>.delayed(const Duration(seconds: 5), () {
      try {
        html.Url.revokeObjectUrl(url);
      } catch (_) {}
    });
  }
}

