#!/bin/bash
# استخراج delivery.db من volume Docker (app-data) إلى ./data/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/data/delivery.db"
mkdir -p "$ROOT/data"

if [ -f "$OUT" ] && [ -s "$OUT" ]; then
  echo "==> SQLite موجود مسبقاً: $OUT ($(du -h "$OUT" | cut -f1))"
  exit 0
fi

echo "==> البحث عن delivery.db داخل Docker..."

# 1) من حاوية التطبيق إن وُجدت
if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx 'delivery-system'; then
  if docker cp delivery-system:/app/data/delivery.db "$OUT" 2>/dev/null && [ -s "$OUT" ]; then
    echo "==> تم النسخ من حاوية delivery-system → $OUT"
    exit 0
  fi
fi

# 2) من volume app-data
VOL=""
VOL=$(docker volume ls -q 2>/dev/null | grep 'app-data$' | head -1 || true)
if [ -n "$VOL" ]; then
  echo "==> volume: $VOL"
  docker run --rm \
    -v "${VOL}:/vol:ro" \
    -v "$ROOT/data:/out" \
    alpine:3.20 \
    sh -c 'test -f /vol/delivery.db && cp /vol/delivery.db /out/delivery.db && ls -la /out/delivery.db'

  if [ -f "$OUT" ] && [ -s "$OUT" ]; then
    echo "==> تم النسخ من volume → $OUT"
    exit 0
  fi
fi

# 3) مسارات بديلة
for alt in "$ROOT/data/delivery.db" "/opt/delivery-system/data/delivery.db"; do
  if [ -f "$alt" ] && [ -s "$alt" ] && [ "$alt" != "$OUT" ]; then
    cp "$alt" "$OUT"
    echo "==> تم النسخ من $alt"
    exit 0
  fi
done

echo "ERROR: لم يُعثر على delivery.db"
echo "جرّب: docker volume ls | grep app-data"
echo "       docker run --rm -v VOLUME_NAME:/vol alpine ls -la /vol"
exit 1
