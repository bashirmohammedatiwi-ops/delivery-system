#!/bin/bash
# بناء APK لتطبيق ديما الحياة (Flutter — سائق + موظف)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/delivery_app"
API_URL="${API_URL:-https://demaalhayaadelivery.online}"

if [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if ! command -v flutter >/dev/null 2>&1; then
  echo "ثبّت Flutter: https://docs.flutter.dev/get-started/install"
  exit 1
fi

cd "$APP_DIR"
echo "==> API: $API_URL"
flutter pub get
flutter build apk --release --dart-define=API_URL="$API_URL"

OUT="$APP_DIR/build/app/outputs/flutter-apk/app-release.apk"
DEST="$ROOT/releases/demaalhayat-delivery-$(date +%Y%m%d).apk"
mkdir -p "$ROOT/releases"
cp "$OUT" "$DEST"

echo ""
echo "✓ APK جاهز:"
echo "  $OUT"
echo "  $DEST"
echo ""
echo "ثبّت على Android: انقل الملف للهاتف وافتحه، أو:"
echo "  adb install -r \"$DEST\""
