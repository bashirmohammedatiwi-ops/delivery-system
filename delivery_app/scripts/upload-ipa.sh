#!/bin/bash
# بناء IPA ورفعه بدون Xcode Organizer (يتجاوز خطأ 500)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEAM_ID="${TEAM_ID:-629ARMBUX8}"
API_URL="${API_URL:-https://demaalhayaadelivery.online}"

if [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

cd "$ROOT"

echo "══════════════════════════════════════════"
echo " بناء IPA — ديما الحياة"
echo " API: $API_URL"
echo "══════════════════════════════════════════"

flutter pub get
flutter build ipa --release \
  --dart-define=API_URL="$API_URL" \
  --export-options-plist=ios/ExportOptions.plist

IPA="$ROOT/build/ios/ipa/delivery_app.ipa"
if [ ! -f "$IPA" ]; then
  IPA="$(ls -1 "$ROOT/build/ios/ipa/"*.ipa 2>/dev/null | head -1 || true)"
fi
if [ -z "${IPA:-}" ] || [ ! -f "$IPA" ]; then
  echo "❌ لم يُنشأ ملف IPA"
  exit 1
fi

DEST="$ROOT/releases/demaalhayat-ios-$(date +%Y%m%d).ipa"
mkdir -p "$ROOT/releases"
cp "$IPA" "$DEST"

echo ""
echo "✅ IPA جاهز:"
echo "   $IPA"
echo "   $DEST"
echo ""
echo "══════════════════════════════════════════"
echo " الرفع (تجاوز خطأ Xcode 500):"
echo "══════════════════════════════════════════"
echo ""
echo "【الطريقة 1 — Transporter (موصى بها)】"
echo "  1) حمّل Transporter من Mac App Store"
echo "  2) افتح Transporter → سجّل دخول Apple ID"
echo "  3) اسحب الملف:"
echo "     $DEST"
echo "  4) Deliver"
echo ""
echo "【الطريقة 2 — Terminal】"
echo "  xcrun altool --upload-app -f \"$DEST\" -t ios \\"
echo "    -u \"YOUR_APPLE_ID\" -p \"APP_SPECIFIC_PASSWORD\""
echo ""
echo "【قبل الرفع — App Store Connect】"
echo "  https://appstoreconnect.apple.com"
echo "  My Apps → + → Bundle ID: com.deemaalhayat.deliveryApp"
echo ""

if [ -d "/Applications/Transporter.app" ]; then
  echo "==> فتح Transporter..."
  open -a Transporter "$DEST" 2>/dev/null || open -a Transporter
else
  echo "⚠️  Transporter غير مثبت — حمّله من App Store"
  open "macappstore://apps.apple.com/app/transporter/id1450874784"
fi
