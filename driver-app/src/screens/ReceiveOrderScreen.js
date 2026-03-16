import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { receiveOrder } from '../api';
import { THEME } from '../theme';

function normalizeBarcode(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\D/g, '');
}

export default function ReceiveOrderScreen({ navigation }) {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(true);
  const [scanned, setScanned] = useState(false);

  const processReceive = useCallback(
    async (shipmentNum) => {
      const num = normalizeBarcode(shipmentNum) || String(shipmentNum || '').trim();
      if (!num) {
        Alert.alert('تنبيه', 'رقم الشحنة غير صالح', [{ text: 'OK', onPress: () => setScanned(false) }]);
        return;
      }
      setLoading(true);
      try {
        const result = await receiveOrder(token, num);
        Alert.alert(
          'تم',
          `تم استلام الطلب #${result.order?.ShipmentNumber || num} بنجاح.\n\nاضغط OK للمتابعة ومسح الطلب التالي.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                setManualInput('');
                navigation.navigate('OrderDetail', { order: result.order });
              },
            },
          ],
          { cancelable: false }
        );
      } catch (e) {
        Alert.alert('خطأ', e.message || 'فشل استلام الطلب', [{ text: 'OK', onPress: () => setScanned(false) }]);
      } finally {
        setLoading(false);
      }
    },
    [token, navigation]
  );

  const handleBarCodeScanned = useCallback(
    ({ data }) => {
      if (scanned) return;
      setScanned(true);
      const num = normalizeBarcode(data) || data;
      if (num) processReceive(num);
      else setScanned(false);
    },
    [scanned, processReceive]
  );

  const handleManualSubmit = () => {
    const num = normalizeBarcode(manualInput) || manualInput.trim();
    if (!num) {
      Alert.alert('تنبيه', 'أدخل رقم الشحنة');
      return;
    }
    processReceive(num);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>جاري طلب إذن الكاميرا...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={56} color={THEME.primary} />
        </View>
        <Text style={styles.permissionText}>يجب السماح بالوصول للكاميرا لمسح الباركود</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionBtnText}>السماح للكاميرا</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, scanMode && styles.toggleActive]}
          onPress={() => setScanMode(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="barcode-outline" size={20} color={scanMode ? '#fff' : THEME.textMuted} />
          <Text style={[styles.toggleText, scanMode && styles.toggleTextActive]}>مسح الباركود</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !scanMode && styles.toggleActive]}
          onPress={() => setScanMode(false)}
          activeOpacity={0.85}
        >
          <Ionicons name="keypad-outline" size={20} color={!scanMode ? '#fff' : THEME.textMuted} />
          <Text style={[styles.toggleText, !scanMode && styles.toggleTextActive]}>إدخال الرقم</Text>
        </TouchableOpacity>
      </View>

      {scanMode ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'codabar', 'qr'],
            }}
          />
          {(scanned || loading) ? (
            <View style={styles.blockingOverlay}>
              {loading ? (
                <>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.blockingText}>جاري استلام الطلب...</Text>
                </>
              ) : (
                <Text style={styles.blockingText}>اضغط OK في الرسالة للمتابعة</Text>
              )}
            </View>
          ) : null}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.scanFrame}>
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
            <Text style={styles.overlayText}>وجّه الكاميرا نحو الباركود</Text>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.manualWrap}
        >
          <TextInput
            style={styles.input}
            placeholder="أدخل رقم الشحنة"
            placeholderTextColor={THEME.textLight}
            value={manualInput}
            onChangeText={setManualInput}
            keyboardType="number-pad"
            editable={!loading}
            onSubmitEditing={handleManualSubmit}
          />
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleManualSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>استلام الطلب</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748b' },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionText: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 20 },
  permissionBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: THEME.radiusMd,
  },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', padding: 16, gap: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: THEME.radiusMd,
    backgroundColor: THEME.border,
  },
  toggleActive: { backgroundColor: THEME.primary },
  toggleText: { fontSize: 15, color: '#64748b' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  cameraWrap: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 260,
    height: 120,
    borderWidth: 2,
    borderColor: 'rgba(15, 118, 110, 0.9)',
    borderRadius: THEME.radiusMd,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(255,255,255,0.9)',
    borderWidth: 3,
  },
  scanCornerTL: { top: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
  scanCornerTR: { top: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
  scanCornerBL: { bottom: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
  scanCornerBR: { bottom: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
  overlayText: {
    marginTop: 24,
    fontSize: 16,
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  manualWrap: { padding: 24 },
  input: {
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    padding: 18,
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: THEME.primary,
    borderRadius: THEME.radiusMd,
    padding: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
