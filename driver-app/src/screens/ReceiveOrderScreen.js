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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../context/AuthContext';
import { receiveOrder } from '../api';

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
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>جاري طلب إذن الكاميرا...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>يجب السماح بالوصول للكاميرا لمسح الباركود</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
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
        >
          <Text style={[styles.toggleText, scanMode && styles.toggleTextActive]}>مسح الباركود</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !scanMode && styles.toggleActive]}
          onPress={() => setScanMode(false)}
        >
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
            <View style={styles.scanFrame} />
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
            placeholderTextColor="#94a3b8"
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748b' },
  permissionText: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 20 },
  permissionBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', padding: 16, gap: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  toggleActive: { backgroundColor: '#0ea5e9' },
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
    borderColor: 'rgba(14, 165, 233, 0.8)',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
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
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
