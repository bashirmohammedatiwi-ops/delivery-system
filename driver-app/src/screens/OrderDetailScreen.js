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

  const handleReturn = async () => {
    Alert.alert(
      'إرجاع الطلب',
      `هل تريد إرجاع الطلب #${order.ShipmentNumber}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، إرجاع',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await markOrderReturned(token, order.OrderID);
              Alert.alert('تم', 'تم إرجاع الطلب');
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
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  shipment: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 16,
    textAlign: 'right',
  },
  row: { marginBottom: 12 },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  value: { fontSize: 15, color: '#1e293b', textAlign: 'right' },
  link: { color: '#1e40af', textDecorationLine: 'underline' },
  amount: { fontSize: 18, fontWeight: '700', color: '#16a34a' },
  actions: { gap: 12 },
  btn: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDeliver: { backgroundColor: '#16a34a' },
  btnReturn: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
