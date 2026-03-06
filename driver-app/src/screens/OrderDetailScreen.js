import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { markOrderDelivered, markOrderReturned } from '../api';

function formatIQD(n) {
  return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع';
}

export default function OrderDetailScreen({ route, navigation }) {
  const { order } = route.params || {};
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>الطلب غير موجود</Text>
      </View>
    );
  }

  const callCustomer = () => {
    const phone = (order.CustomerPhone || '').replace(/\D/g, '');
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('تنبيه', 'رقم الهاتف غير متوفر');
  };

  const handleDeliver = async () => {
    Alert.alert(
      'تأكيد التوصيل',
      `هل تم توصيل الطلب #${order.ShipmentNumber} بنجاح؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، تم التوصيل',
          onPress: async () => {
            setLoading(true);
            try {
              await markOrderDelivered(token, order.OrderID);
              Alert.alert('تم', 'تم تأكيد التوصيل بنجاح');
              navigation.goBack();
            } catch (e) {
              Alert.alert('خطأ', e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const RETURN_REASONS = [
    'غير متوفر',
    'رفض الاستلام',
    'عنوان خاطئ',
    'المحل مغلق',
    'أخرى',
  ];

  const doReturn = async (reason) => {
    setLoading(true);
    try {
      await markOrderReturned(token, order.OrderID, reason);
      Alert.alert('تم', 'تم إرجاع الطلب');
      navigation.goBack();
    } catch (e) {
      Alert.alert('خطأ', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = () => {
    Alert.alert(
      'إرجاع الطلب - اختر سبب الإرجاع',
      `الطلب #${order.ShipmentNumber} مرفوض من الزبون. اختر السبب:`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'غير متوفر', onPress: () => doReturn('غير متوفر') },
        { text: 'رفض الاستلام', onPress: () => doReturn('رفض الاستلام') },
        { text: 'عنوان خاطئ', onPress: () => doReturn('عنوان خاطئ') },
        { text: 'المحل مغلق', onPress: () => doReturn('المحل مغلق') },
        { text: 'أخرى', onPress: () => doReturn('أخرى') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.shipment}>#{order.ShipmentNumber}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>المحل</Text>
          <Text style={styles.value}>{order.StoreName || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>العميل</Text>
          <Text style={styles.value}>{order.CustomerName || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>هاتف العميل</Text>
          <TouchableOpacity onPress={callCustomer}>
            <Text style={[styles.value, styles.link]}>{order.CustomerPhone || '—'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>العنوان</Text>
          <Text style={styles.value}>{order.Address || '—'}</Text>
        </View>
        {order.CustomerLocationLink ? (
          <View style={styles.row}>
            <Text style={styles.label}>رابط موقع الزبون</Text>
            <TouchableOpacity onPress={() => Linking.openURL(order.CustomerLocationLink)}>
              <Text style={[styles.value, styles.link]}>📍 فتح الموقع على الخريطة</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {order.RegionName ? (
          <View style={styles.row}>
            <Text style={styles.label}>المنطقة</Text>
            <Text style={styles.value}>{order.RegionName}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.label}>العدد</Text>
          <Text style={styles.value}>{order.Pieces || 1}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>المبلغ</Text>
          <Text style={styles.amount}>{formatIQD(order.TotalIQD)}</Text>
        </View>
        {order.Notes ? (
          <View style={styles.row}>
            <Text style={styles.label}>ملاحظات</Text>
            <Text style={styles.value}>{order.Notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnDeliver, loading && styles.btnDisabled]}
          onPress={handleDeliver}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>✓ تم التوصيل</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnReturn, loading && styles.btnDisabled]}
          onPress={handleReturn}
          disabled={loading}
        >
          <Text style={styles.btnText}>↩ إرجاع الطلب</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  shipment: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0ea5e9',
    marginBottom: 20,
    textAlign: 'right',
  },
  row: { marginBottom: 14 },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  value: { fontSize: 16, color: '#0f172a', textAlign: 'right' },
  link: { color: '#0ea5e9', textDecorationLine: 'underline' },
  amount: { fontSize: 20, fontWeight: '700', color: '#10b981' },
  actions: { gap: 14 },
  btn: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDeliver: { backgroundColor: '#10b981' },
  btnReturn: { backgroundColor: '#ef4444' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
