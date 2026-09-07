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
  Modal,
  TextInput,
  Pressable,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { markOrderDelivered, markOrderReturned, markOrderDeferred, resumeDeferredOrder } from '../api';
import { formatIQD, isDeferredOrder } from '../utils/format';
import { buildOrderShareText } from '../utils/orderUtils';
import { THEME } from '../theme';

function DetailRow({ icon, label, value, onPress, highlight }) {
  const content = (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color={highlight ? THEME.primary : THEME.textMuted} />
      </View>
      <View style={styles.detailBody}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value || '—'}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-back" size={18} color={THEME.textLight} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export default function OrderDetailScreen({ route, navigation }) {
  const { order, readOnly } = route.params || {};
  const { token } = useAuth();
  const { refresh } = useAppData();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [deferModalVisible, setDeferModalVisible] = useState(false);
  const [deferReason, setDeferReason] = useState('');

  const afterSuccess = async () => {
    await refresh();
    navigation.goBack();
  };

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.missingText}>الطلب غير موجود</Text>
      </View>
    );
  }

  const deferred = isDeferredOrder(order);
  const viewOnly = !!readOnly;

  const callCustomer = () => {
    const phone = (order.CustomerPhone || '').replace(/\D/g, '');
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('تنبيه', 'رقم الهاتف غير متوفر');
  };

  const handleDeliver = async () => {
    Alert.alert('تأكيد التوصيل', `هل تم توصيل الطلب #${order.ShipmentNumber} بنجاح؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم، تم التوصيل',
        onPress: async () => {
          setLoading(true);
          try {
            await markOrderDelivered(token, order.OrderID);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('تم', 'تم تأكيد التوصيل بنجاح');
            await afterSuccess();
          } catch (e) {
            Alert.alert('خطأ', e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const doReturn = async (reason) => {
    setLoading(true);
    try {
      await markOrderReturned(token, order.OrderID, reason);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('تم', 'تم إرجاع الطلب');
      await afterSuccess();
    } catch (e) {
      Alert.alert('خطأ', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = () => {
    Alert.alert('إرجاع الطلب', `اختر سبب إرجاع الطلب #${order.ShipmentNumber}:`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'غير متوفر', onPress: () => doReturn('غير متوفر') },
      { text: 'رفض الاستلام', onPress: () => doReturn('رفض الاستلام') },
      { text: 'عنوان خاطئ', onPress: () => doReturn('عنوان خاطئ') },
      { text: 'المحل مغلق', onPress: () => doReturn('المحل مغلق') },
      { text: 'أخرى', onPress: () => doReturn('أخرى') },
    ]);
  };

  const submitDefer = async () => {
    const reason = deferReason.trim();
    if (!reason) {
      Alert.alert('تنبيه', 'اكتب سبب التأجيل');
      return;
    }
    setLoading(true);
    try {
      await markOrderDeferred(token, order.OrderID, reason);
      setDeferModalVisible(false);
      setDeferReason('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('تم', 'تم تأجيل الطلب');
      await afterSuccess();
    } catch (e) {
      Alert.alert('خطأ', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDefer = () => {
    Alert.alert('إلغاء التأجيل', 'هل تريد إعادة الطلب للتوصيل الآن؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم',
        onPress: async () => {
          setLoading(true);
          try {
            await resumeDeferredOrder(token, order.OrderID);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('تم', 'تم إلغاء التأجيل');
            await afterSuccess();
          } catch (e) {
            Alert.alert('خطأ', e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const copyShipment = async () => {
    await Clipboard.setStringAsync(String(order.ShipmentNumber || ''));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('تم النسخ', `رقم الشحنة #${order.ShipmentNumber}`);
  };

  const shareOrder = async () => {
    try {
      await Share.share({ message: buildOrderShareText(order) });
    } catch (_) {}
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, !viewOnly && { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {viewOnly ? (
          <View style={styles.bannerInfo}>
            <Ionicons name="information-circle" size={20} color={THEME.accentBlue} />
            <Text style={styles.bannerInfoText}>طلب منتظر — للعرض فقط قبل الاستلام</Text>
          </View>
        ) : null}

        {deferred ? (
          <View style={styles.bannerWarning}>
            <Ionicons name="pause-circle" size={20} color={THEME.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerWarningTitle}>طلب مؤجل</Text>
              {order.DeferredReason ? <Text style={styles.bannerWarningSub}>{order.DeferredReason}</Text> : null}
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.hero, deferred && styles.heroDeferred]} onPress={copyShipment} activeOpacity={0.9}>
          <View style={styles.heroIcon}>
            <Ionicons name="cube" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>رقم الشحنة — اضغط للنسخ</Text>
            <Text style={styles.heroNumber}>#{order.ShipmentNumber}</Text>
          </View>
          <View style={styles.heroAmount}>
            <Text style={styles.heroAmountLabel}>الإجمالي</Text>
            <Text style={styles.heroAmountValue}>{formatIQD(order.TotalIQD)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.quickContactRow}>
          <ContactChip icon="call" label="اتصال" onPress={callCustomer} color={THEME.success} />
          {order.CustomerLocationLink ? (
            <ContactChip icon="navigate" label="خريطة" onPress={() => Linking.openURL(order.CustomerLocationLink)} color={THEME.accentBlue} />
          ) : null}
          <ContactChip icon="copy" label="نسخ" onPress={copyShipment} color={THEME.textSecondary} />
          <ContactChip icon="share-social" label="مشاركة" onPress={shareOrder} color={THEME.accentPurple} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الطلب</Text>
          <DetailRow icon="storefront-outline" label="المحل" value={order.StoreName} />
          {order.StorePhone ? <DetailRow icon="call-outline" label="هاتف المتجر" value={order.StorePhone} /> : null}
          <DetailRow icon="person-outline" label="العميل" value={order.CustomerName} />
          <DetailRow
            icon="call"
            label="هاتف العميل"
            value={order.CustomerPhone}
            onPress={callCustomer}
            highlight
          />
          <DetailRow icon="location-outline" label="العنوان" value={order.Address} />
          {order.CustomerLocationLink ? (
            <DetailRow
              icon="navigate-outline"
              label="موقع الزبون"
              value="فتح على الخريطة"
              onPress={() => Linking.openURL(order.CustomerLocationLink)}
              highlight
            />
          ) : null}
          {order.RegionName ? <DetailRow icon="map-outline" label="المنطقة" value={order.RegionName} /> : null}
          {order.AdminOrderNo ? <DetailRow icon="document-text-outline" label="رقم الأدمن" value={order.AdminOrderNo} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>المبالغ</Text>
          <DetailRow icon="layers-outline" label="العدد" value={String(order.Pieces || 1)} />
          <DetailRow icon="receipt-outline" label="مبلغ الفاتورة" value={formatIQD(order.AmountIQD)} />
          <DetailRow icon="bicycle-outline" label="أجرة التوصيل" value={formatIQD(order.DeliveryFeeIQD || order.WaivedDeliveryIQD)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>المبلغ الإجمالي</Text>
            <Text style={styles.totalValue}>{formatIQD(order.TotalIQD)}</Text>
          </View>
          {order.Notes ? <DetailRow icon="chatbox-ellipses-outline" label="ملاحظات" value={order.Notes} /> : null}
        </View>
      </ScrollView>

      {!viewOnly ? (
        <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.stickyRow}>
            {deferred ? (
              <StickyBtn icon="play" label="متابعة" color={THEME.primary} onPress={handleResumeDefer} loading={loading} />
            ) : (
              <StickyBtn icon="pause" label="تأجيل" color={THEME.warning} onPress={() => setDeferModalVisible(true)} loading={loading} />
            )}
            <StickyBtn icon="checkmark" label="توصيل" color={THEME.success} onPress={handleDeliver} loading={loading} primary />
            <StickyBtn icon="return-up-back" label="إرجاع" color={THEME.danger} onPress={handleReturn} loading={loading} />
          </View>
        </View>
      ) : null}

      <Modal visible={deferModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>سبب تأجيل الطلب</Text>
            <Text style={styles.modalHint}>مثال: الزبون غير متواجد — سأراجع غداً</Text>
            <TextInput
              style={styles.modalInput}
              value={deferReason}
              onChangeText={setDeferReason}
              placeholder="اكتب سبب التأجيل..."
              placeholderTextColor={THEME.textLight}
              multiline
              textAlign="right"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => { setDeferModalVisible(false); setDeferReason(''); }}>
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={submitDefer}>
                <Text style={styles.modalConfirmText}>تأكيد التأجيل</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ContactChip({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity style={styles.contactChip} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.contactChipText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StickyBtn({ icon, label, color, onPress, loading, primary }) {
  return (
    <TouchableOpacity
      style={[styles.stickyBtn, primary && { backgroundColor: color, flex: 1.4 }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={primary ? '#fff' : color} size="small" />
      ) : (
        <>
          <Ionicons name={icon} size={20} color={primary ? '#fff' : color} />
          <Text style={[styles.stickyBtnText, primary && styles.stickyBtnTextPrimary, !primary && { color }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: THEME.spaceLg, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  missingText: { color: THEME.textMuted, fontSize: THEME.fontMd },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.accentBlueSoft,
    padding: THEME.spaceMd,
    borderRadius: THEME.radiusMd,
    marginBottom: THEME.spaceMd,
  },
  bannerInfoText: { flex: 1, color: THEME.accentBlue, fontWeight: '700', fontSize: THEME.fontSm },
  bannerWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: THEME.warningSoft,
    padding: THEME.spaceMd,
    borderRadius: THEME.radiusMd,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  bannerWarningTitle: { fontSize: THEME.fontMd, fontWeight: '900', color: THEME.warning },
  bannerWarningSub: { fontSize: THEME.fontSm, color: THEME.textSecondary, marginTop: 4, lineHeight: 20 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primaryDark,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    ...THEME.shadowMd,
  },
  heroDeferred: { backgroundColor: '#b45309' },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: THEME.radiusMd,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spaceMd,
  },
  heroLabel: { fontSize: THEME.fontXs, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  heroNumber: { fontSize: THEME.font2xl, fontWeight: '900', color: '#fff' },
  heroAmount: { marginRight: 'auto', alignItems: 'flex-end' },
  heroAmountLabel: { fontSize: THEME.fontXs, color: 'rgba(255,255,255,0.75)' },
  heroAmountValue: { fontSize: THEME.fontMd, fontWeight: '900', color: '#fff', marginTop: 2 },
  card: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  cardTitle: {
    fontSize: THEME.fontMd,
    fontWeight: '900',
    color: THEME.text,
    marginBottom: THEME.spaceMd,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spaceSm,
  },
  detailBody: { flex: 1 },
  detailLabel: { fontSize: THEME.fontXs, color: THEME.textMuted, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: THEME.fontMd, color: THEME.text, fontWeight: '600', textAlign: 'right' },
  detailValueHighlight: { color: THEME.primary, fontWeight: '800' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: THEME.spaceMd,
    marginTop: THEME.spaceSm,
  },
  totalLabel: { fontSize: THEME.fontMd, fontWeight: '800', color: THEME.textSecondary },
  totalValue: { fontSize: THEME.fontXl, fontWeight: '900', color: THEME.success },
  quickContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spaceSm,
    marginBottom: THEME.spaceMd,
  },
  contactChip: {
    flexGrow: 1,
    minWidth: '22%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.bgCard,
    paddingVertical: 12,
    borderRadius: THEME.radiusMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  contactChipText: { fontSize: THEME.fontSm, fontWeight: '800' },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.bgCard,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    paddingTop: THEME.spaceMd,
    paddingHorizontal: THEME.spaceLg,
    ...THEME.shadowLg,
  },
  stickyRow: { flexDirection: 'row', gap: THEME.spaceSm },
  stickyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: THEME.radiusMd,
    backgroundColor: THEME.bgMuted,
  },
  stickyBtnText: { fontSize: THEME.fontSm, fontWeight: '900' },
  stickyBtnTextPrimary: { color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: THEME.space2xl,
  },
  modalBox: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceXl,
    ...THEME.shadowLg,
  },
  modalTitle: { fontSize: THEME.fontXl, fontWeight: '900', color: THEME.text, textAlign: 'center' },
  modalHint: { fontSize: THEME.fontSm, color: THEME.textMuted, textAlign: 'center', marginTop: 6, marginBottom: THEME.spaceMd },
  modalInput: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    padding: THEME.spaceMd,
    minHeight: 100,
    fontSize: THEME.fontMd,
    backgroundColor: THEME.bgMuted,
    marginBottom: THEME.spaceMd,
  },
  modalActions: { flexDirection: 'row', gap: THEME.spaceSm },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: THEME.radiusMd,
    backgroundColor: THEME.bgMuted,
    alignItems: 'center',
  },
  modalCancelText: { color: THEME.textMuted, fontWeight: '800' },
  modalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: THEME.radiusMd,
    backgroundColor: THEME.warning,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontWeight: '800' },
});
