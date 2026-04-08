import 'dart:io';
import 'dart:typed_data';

import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';

Future<void> openPdfBytesImpl(Uint8List bytes, {required String filename}) async {
  final dir = await getTemporaryDirectory();
  final safe = filename.trim().isEmpty ? 'label.pdf' : filename.trim();
  final file = File('${dir.path}/$safe');
  await file.writeAsBytes(bytes, flush: true);
  await OpenFile.open(file.path);
}

