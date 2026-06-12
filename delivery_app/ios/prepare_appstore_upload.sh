#!/bin/bash
# تحقق من جاهزية الرفع إلى App Store Connect
set -euo pipefail

TEAM_ID="629ARMBUX8"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== فحص شهادات التوقيع ==="
DEV=$(security find-identity -v -p codesigning 2>/dev/null | grep -c "Apple Development" || true)
DIST=$(security find-identity -v -p codesigning 2>/dev/null | grep -c "Apple Distribution" || true)
security find-identity -v -p codesigning 2>/dev/null || true

echo ""
if [ "$DIST" -eq 0 ]; then
  echo "❌ لا توجد شهادة Apple Distribution على هذا الجهاز."
  echo "   بعد الموافقة على اتفاقية Apple (PLA):"
  echo "   Xcode → Settings → Accounts → Team $TEAM_ID → Manage Certificates → + → Apple Distribution"
else
  echo "✅ وُجدت شهادة Apple Distribution."
fi

if [ "$DEV" -eq 0 ]; then
  echo "⚠️  لا توجد شهادة Apple Development (للتشغيل على الجهاز فقط)."
fi

echo ""
echo "=== فحص اتفاقية Apple (PLA) عبر محاولة تصدير تجريبية ==="
ARCHIVE="/tmp/Runner-check.xcarchive"
if [ -d "$ARCHIVE" ]; then rm -rf "$ARCHIVE"; fi

cd "$ROOT"
if xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Release \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM_ID" archive -archivePath "$ARCHIVE" >/tmp/archive-check.log 2>&1; then
  echo "✅ Archive نجح."
else
  echo "❌ Archive فشل — راجع /tmp/archive-check.log"
  tail -20 /tmp/archive-check.log
  exit 1
fi

EXPORT_DIR="/tmp/RunnerExport-check"
rm -rf "$EXPORT_DIR"
if xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$ROOT/ExportOptions.plist" -allowProvisioningUpdates >/tmp/export-check.log 2>&1; then
  echo "✅ Export للرفع جاهز — يمكنك الرفع من Xcode أو Transporter."
  ls -la "$EXPORT_DIR"
  exit 0
fi

echo "❌ Export فشل — السبب الأرجح:"
grep -E "PLA Update|Distribution|error:" /tmp/export-check.log | head -10 || tail -15 /tmp/export-check.log

echo ""
echo "=== خطوات الحل (يجب تنفيذها يدوياً) ==="
echo "1) افتح https://developer.apple.com/account"
echo "   سجّل دخول Account Holder → Review Agreement → Agree"
echo "2) Xcode → Settings (⌘,) → Accounts → Apple ID → Team $TEAM_ID"
echo "   Manage Certificates → + → Apple Distribution"
echo "3) افتح Runner.xcworkspace → Runner → Signing & Capabilities"
echo "   ✓ Automatically manage signing  |  Team: $TEAM_ID"
echo "4) Product → Archive → Distribute App → App Store Connect → Upload"
echo ""
echo "بعد الخطوتين 1 و 2، شغّل هذا السكربت مرة أخرى للتحقق."

exit 1
