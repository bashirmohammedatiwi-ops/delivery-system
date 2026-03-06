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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { markOrderDelivered, markOrderReturned } from '../api';
import { THEME } from '../theme';

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
      <View style={styles.shipmentHeader}>
        <View style={styles.shipmentBadge}>
          <Ionicons name="cube" size={24} color="#fff" />
          <Text style={styles.shipmentNum}>#{order.ShipmentNumber}</Text>
        </View>
      </View>

      <View style={styles.card}>
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
            <View style={styles.phoneRow}>
              <Ionicons name="call" size={18} color={THEME.primary} />
              <Text style={[styles.value, styles.link]}>{order.CustomerPhone || '—'}</Text>
            </View>
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
              <View style={styles.phoneRow}>
                <Ionicons name="navigate" size={18} color={THEME.primary} />
                <Text style={[styles.value, styles.link]}>فتح الموقع على الخريطة</Text>
              </View>
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
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.btnIcon} />
              <Text style={styles.btnText}>تم التوصيل</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnReturn, loading && styles.btnDisabled]}
          onPress={handleReturn}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="return-up-back" size={24} color="#fff" style={styles.btnIcon} />
          <Text style={styles.btnText}>إرجاع الطلب</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  shipmentHeader: { marginBottom: 20 },
  shipmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  shipmentNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  card: {
    backgroundColor: THEME.bgCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  row: { marginBottom: 16 },
  label: { fontSize: 12, color: THEME.textLight, marginBottom: 4 },
  value: { fontSize: 16, color: THEME.text, textAlign: 'right' },
  link: { color: THEME.primary, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  amount: { fontSize: 22, fontWeight: '800', color: THEME.success },
  actions: { gap: 14 },
  btn: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: { marginLeft: 8 },
  btnDeliver: { backgroundColor: THEME.success },
  btnReturn: { backgroundColor: THEME.danger },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
