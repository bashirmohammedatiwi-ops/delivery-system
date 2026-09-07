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
import { useAppData } from '../context/AppDataContext';
import { receiveOrder } from '../api';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';
import LoadingView from '../components/LoadingView';

function normalizeBarcode(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\D/g, '');
}

export default function ReceiveOrderScreen({ navigation }) {
  const { token } = useAuth();
  const { refresh } = useAppData();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

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
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'تم الاستلام',
          `تم استلام الطلب #${result.order?.ShipmentNumber || num} بنجاح`,
          [{
            text: 'عرض التفاصيل',
            onPress: () => {
              setScanned(false);
              setManualInput('');
              navigation.navigate('OrderDetail', { order: result.order });
            },
          }],
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
    return <LoadingView message="جاري طلب إذن الكاميرا..." />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={52} color={THEME.primary} />
        </View>
        <Text style={styles.permissionTitle}>صلاحية الكاميرا مطلوبة</Text>
        <Text style={styles.permissionText}>اسمح بالوصول للكاميرا لمسح باركود الشحنة</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionBtnText}>السماح للكاميرا</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.modeSwitch}>
        <TouchableOpacity
          style={[styles.modeBtn, scanMode && styles.modeBtnActive]}
          onPress={() => setScanMode(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="scan-outline" size={18} color={scanMode ? '#fff' : THEME.textMuted} />
          <Text style={[styles.modeText, scanMode && styles.modeTextActive]}>مسح</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, !scanMode && styles.modeBtnActive]}
          onPress={() => setScanMode(false)}
          activeOpacity={0.85}
        >
          <Ionicons name="keypad-outline" size={18} color={!scanMode ? '#fff' : THEME.textMuted} />
          <Text style={[styles.modeText, !scanMode && styles.modeTextActive]}>إدخال يدوي</Text>
        </TouchableOpacity>
      </View>

      {scanMode ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torchOn}
            onBarcodeScanned={scanned || loading ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'codabar', 'qr'],
            }}
          />
          <TouchableOpacity
            style={styles.torchBtn}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.85}
          >
            <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={22} color="#fff" />
          </TouchableOpacity>
          {(scanned || loading) ? (
            <View style={styles.blockingOverlay}>
              {loading ? (
                <>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.blockingText}>جاري استلام الطلب...</Text>
                </>
              ) : (
                <Text style={styles.blockingText}>اضغط «عرض التفاصيل» للمتابعة</Text>
              )}
            </View>
          ) : null}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.overlayText}>وجّه الكاميرا نحو الباركود</Text>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.manualWrap}>
          <View style={styles.manualCard}>
            <Ionicons name="barcode-outline" size={40} color={THEME.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
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
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitText}>استلام الطلب</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: THEME.space2xl },
  permissionIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spaceLg,
  },
  permissionTitle: { fontSize: THEME.fontXl, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  permissionText: { fontSize: THEME.fontMd, color: THEME.textMuted, textAlign: 'center', marginBottom: THEME.spaceLg, lineHeight: 22 },
  permissionBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: THEME.radiusFull,
  },
  permissionBtnText: { color: '#fff', fontSize: THEME.fontMd, fontWeight: '800' },
  modeSwitch: {
    flexDirection: 'row',
    margin: THEME.spaceLg,
    backgroundColor: THEME.bgMuted,
    borderRadius: THEME.radiusMd,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: THEME.radiusSm,
  },
  modeBtnActive: { backgroundColor: THEME.primary, ...THEME.shadowSm },
  modeText: { fontSize: THEME.fontSm, fontWeight: '700', color: THEME.textMuted },
  modeTextActive: { color: '#fff' },
  cameraWrap: { flex: 1, position: 'relative', marginHorizontal: THEME.spaceLg, marginBottom: THEME.spaceLg, borderRadius: THEME.radiusXl, overflow: 'hidden' },
  torchBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: 260,
    height: 120,
    borderRadius: THEME.radiusMd,
    position: 'relative',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 3 },
  cornerTL: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerTR: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerBL: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  cornerBR: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  overlayText: {
    marginTop: 24,
    fontSize: THEME.fontMd,
    color: '#fff',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockingText: { marginTop: 16, fontSize: THEME.fontMd, color: '#fff', fontWeight: '600' },
  manualWrap: { flex: 1, padding: THEME.spaceLg },
  manualCard: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.space2xl,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  input: {
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    padding: THEME.spaceLg,
    fontSize: THEME.fontXl,
    marginBottom: THEME.spaceLg,
    textAlign: 'center',
    fontWeight: '800',
    backgroundColor: THEME.bgMuted,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    borderRadius: THEME.radiusMd,
    paddingVertical: 16,
  },
  btnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: THEME.fontMd, fontWeight: '800' },
});
