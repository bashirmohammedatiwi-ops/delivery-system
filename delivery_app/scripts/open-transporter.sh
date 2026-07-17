#!/bin/bash
# تجاوز خطأ Xcode 500 — بناء IPA وفتح Transporter
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-https://demaalhayaadelivery.online}"

if [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

cd "$ROOT"

echo "==> بناء IPA..."
flutter pub get
flutter build ipa --release \
  --dart-define=API_URL="$API_URL" \
  --export-options-plist=ios/ExportOptions.plist

IPA_SRC="$ROOT/build/ios/ipa/delivery_app.ipa"
DEST="$ROOT/../releases/demaalhayat-ios-$(date +%Y%m%d-%H%M).ipa"
mkdir -p "$(dirname "$DEST")"
cp "$IPA_SRC" "$DEST"

echo ""
echo "✅ IPA: $DEST"
echo ""
echo "==> لا تستخدم Xcode Upload (يسبب خطأ 500)"
echo "==> ارفع عبر Transporter فقط"
echo ""

if [ -d "/Applications/Transporter.app" ]; then
  open -a Transporter "$DEST"
else
  echo "حمّل Transporter من App Store ثم اسحب الملف:"
  echo "  $DEST"
  open "macappstore://apps.apple.com/app/transporter/id1450874784"
fi
