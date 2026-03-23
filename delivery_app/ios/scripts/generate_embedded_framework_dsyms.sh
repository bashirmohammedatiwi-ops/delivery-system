#!/bin/sh
# Ensure objective_c.framework.dSYM is present for App Store Connect validation.
# Must run AFTER Flutter "Thin Binary" and CocoaPods embed phases (see Runner target order).

FRAMEWORK_DSYM_NAME="objective_c.framework.dSYM"
BINARY_REL="Frameworks/objective_c.framework/objective_c"

# Only Release/Profile archives need this; skip Debug local runs unless archiving.
case "${CONFIGURATION}" in
  Debug)
    if [ -z "${ARCHIVE_DSYMS_PATH}" ] && [ "${ACTION}" != "install" ]; then
      exit 0
    fi
    ;;
esac

# Resolve Flutter root if Xcode did not export FLUTTER_ROOT (e.g. some archive paths).
if [ -z "${FLUTTER_ROOT}" ] && [ -f "${SRCROOT}/Flutter/Generated.xcconfig" ]; then
  FLUTTER_ROOT=$(grep -m1 '^FLUTTER_ROOT=' "${SRCROOT}/Flutter/Generated.xcconfig" | cut -d= -f2- | tr -d ' ')
  export FLUTTER_ROOT
fi

# Candidate app bundle locations after embed/thin.
for APP_DIR in \
  "${TARGET_BUILD_DIR}/${FULL_PRODUCT_NAME}" \
  "${BUILT_PRODUCTS_DIR}/${FULL_PRODUCT_NAME}" \
  "${CODESIGNING_FOLDER_PATH}"; do
  [ -n "${APP_DIR}" ] || continue
  OBJC_BIN="${APP_DIR}/${BINARY_REL}"
  if [ -f "${OBJC_BIN}" ]; then
    break
  fi
  OBJC_BIN=""
done

if [ -z "${OBJC_BIN}" ] || [ ! -f "${OBJC_BIN}" ]; then
  echo "warning: objective_c.framework binary not found in app bundle (skip dSYM step)."
  exit 0
fi

copy_if_exists() {
  src="$1"
  dest_dir="$2"
  [ -n "${dest_dir}" ] || return 1
  [ -d "${src}" ] || return 1
  mkdir -p "${dest_dir}"
  rm -rf "${dest_dir}/${FRAMEWORK_DSYM_NAME}"
  cp -R "${src}" "${dest_dir}/${FRAMEWORK_DSYM_NAME}"
  echo "Copied ${FRAMEWORK_DSYM_NAME} -> ${dest_dir}/"
  return 0
}

try_copy_from_flutter_cache() {
  [ -n "${FLUTTER_ROOT}" ] || return 1
  [ -n "${CONFIGURATION}" ] || return 1
  lower_cfg=$(echo "${CONFIGURATION}" | tr '[:upper:]' '[:lower:]')
  copy_if_exists "${FLUTTER_ROOT}/bin/cache/artifacts/engine/ios-${lower_cfg}/${FRAMEWORK_DSYM_NAME}" "$1"
}

emit_dsymutil() {
  dest_dir="$1"
  [ -n "${dest_dir}" ] || return 1
  mkdir -p "${dest_dir}"
  rm -rf "${dest_dir}/${FRAMEWORK_DSYM_NAME}"
  # Produces a dSYM with matching UUID even when the framework has no rich debug info.
  dsymutil "${OBJC_BIN}" -o "${dest_dir}/${FRAMEWORK_DSYM_NAME}"
  echo "Generated ${FRAMEWORK_DSYM_NAME} via dsymutil -> ${dest_dir}/"
}

# Xcode may collect symbols from either folder during archive.
for OUT_DIR in "${ARCHIVE_DSYMS_PATH}" "${DWARF_DSYM_FOLDER_PATH}"; do
  [ -n "${OUT_DIR}" ] || continue
  DEST="${OUT_DIR}/${FRAMEWORK_DSYM_NAME}"
  if [ -d "${DEST}" ]; then
    continue
  fi

  copy_if_exists "${TARGET_BUILD_DIR}/${FRAMEWORK_DSYM_NAME}" "${OUT_DIR}" && continue
  copy_if_exists "${BUILT_PRODUCTS_DIR}/${FRAMEWORK_DSYM_NAME}" "${OUT_DIR}" && continue
  copy_if_exists "${CONFIGURATION_BUILD_DIR}/${FRAMEWORK_DSYM_NAME}" "${OUT_DIR}" && continue
  copy_if_exists "${PODS_XCFRAMEWORKS_BUILD_DIR}/objective_c/${FRAMEWORK_DSYM_NAME}" "${OUT_DIR}" && continue
  try_copy_from_flutter_cache "${OUT_DIR}" && continue

  emit_dsymutil "${OUT_DIR}" || true
done

exit 0
