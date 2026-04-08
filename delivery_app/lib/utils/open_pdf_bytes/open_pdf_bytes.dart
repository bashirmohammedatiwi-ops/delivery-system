import 'dart:typed_data';

import 'open_pdf_bytes_stub.dart'
    if (dart.library.html) 'open_pdf_bytes_web.dart'
    if (dart.library.io) 'open_pdf_bytes_io.dart';

/// Opens a PDF from raw bytes on the current platform.
Future<void> openPdfBytes(Uint8List bytes, {required String filename}) {
  return openPdfBytesImpl(bytes, filename: filename);
}

