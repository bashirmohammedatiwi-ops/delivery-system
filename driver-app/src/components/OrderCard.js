import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';
import { formatIQD, isDeferredOrder } from '../utils/format';

export default function OrderCard({
  order,
  onPress,
  compact = false,
  showQuickActions = true,
}) {
  const deferred = isDeferredOrder(order);
  const phone = (order.CustomerPhone || '').replace(/\D/g, '');
  const hasMap = !!order.CustomerLocationLink;

  const copyShipment = async () => {
    await Clipboard.setStringAsync(String(order.ShipmentNumber || ''));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('تم النسخ', `رقم الشحنة #${order.ShipmentNumber} نُسخ`);
  };

  const callCustomer = () => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('تنبيه', 'رقم الهاتف غير متوفر');
  };

  const openMap = () => {
    if (order.CustomerLocationLink) Linking.openURL(order.CustomerLocationLink);
    else Alert.alert('تنبيه', 'رابط الموقع غير متوفر');
  };

  return (
    <TouchableOpacity
      style={[styles.card, deferred && styles.cardDeferred, compact && styles.cardCompact]}
      onPress={onPress}
      onLongPress={copyShipment}
      activeOpacity={0.75}
      delayLongPress={400}
    >
      <View style={[styles.accentBar, deferred && styles.accentBarDeferred]} />
      {deferred ? (
        <View style={styles.statusRibbon}>
          <Ionicons name="pause-circle" size={12} color="#fff" />
          <Text style={styles.statusRibbonText}>مؤجل</Text>
        </View>
      ) : null}

      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={[styles.shipmentPill, deferred && styles.shipmentPillDeferred]}>
            <Ionicons name="cube" size={14} color={deferred ? THEME.warning : THEME.primary} />
            <Text style={[styles.shipment, deferred && styles.shipmentDeferred]}>
              #{order.ShipmentNumber}
            </Text>
          </View>
          <View style={styles.amountPill}>
            <Text style={styles.amount}>{formatIQD(order.TotalIQD)}</Text>
          </View>
        </View>

        <Text style={styles.customer} numberOfLines={1}>{order.CustomerName || '—'}</Text>
        <Text style={styles.address} numberOfLines={compact ? 1 : 2}>{order.Address || '—'}</Text>

        <View style={styles.metaRow}>
          {order.RegionName ? (
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={12} color={THEME.textMuted} />
              <Text style={styles.metaText}>{order.RegionName}</Text>
            </View>
          ) : null}
          {order.StoreName ? (
            <View style={styles.metaChip}>
              <Ionicons name="storefront-outline" size={12} color={THEME.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{order.StoreName}</Text>
            </View>
          ) : null}
        </View>

        {deferred && order.DeferredReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText} numberOfLines={2}>{order.DeferredReason}</Text>
          </View>
        ) : null}

        {showQuickActions ? (
          <View style={styles.actionsRow}>
            <QuickBtn icon="call" label="اتصال" color={THEME.success} onPress={callCustomer} disabled={!phone} />
            <QuickBtn icon="navigate" label="خريطة" color={THEME.accentBlue} onPress={openMap} disabled={!hasMap} />
            <QuickBtn icon="copy-outline" label="نسخ" color={THEME.textSecondary} onPress={copyShipment} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function QuickBtn({ icon, label, color, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.quickBtn, disabled && styles.quickBtnDisabled]}
      onPress={(e) => {
        e?.stopPropagation?.();
        if (!disabled) onPress();
      }}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={16} color={disabled ? THEME.textLight : color} />
      <Text style={[styles.quickBtnText, disabled && styles.quickBtnTextDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    marginBottom: THEME.spaceMd,
    overflow: 'hidden',
    ...THEME.shadowMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  cardDeferred: {
    backgroundColor: '#fffdf5',
    borderColor: 'rgba(217, 119, 6, 0.18)',
  },
  cardCompact: { marginBottom: THEME.spaceSm },
  accentBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME.primary,
  },
  accentBarDeferred: { backgroundColor: THEME.warning },
  statusRibbon: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radiusFull,
    zIndex: 1,
  },
  statusRibbonText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  inner: { padding: THEME.spaceLg, paddingRight: THEME.spaceXl },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spaceSm,
  },
  shipmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radiusFull,
  },
  shipmentPillDeferred: { backgroundColor: THEME.warningSoft },
  shipment: { fontSize: THEME.fontLg, fontWeight: '800', color: THEME.primary },
  shipmentDeferred: { color: THEME.warning },
  amountPill: {
    backgroundColor: THEME.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radiusFull,
  },
  amount: { fontSize: THEME.fontSm, fontWeight: '800', color: THEME.success },
  customer: {
    fontSize: THEME.fontMd,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
  },
  address: {
    fontSize: THEME.fontSm,
    color: THEME.textMuted,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spaceSm,
    marginTop: THEME.spaceSm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.bgMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radiusFull,
    maxWidth: '70%',
  },
  metaText: { fontSize: THEME.fontXs, color: THEME.textMuted, fontWeight: '600' },
  reasonBox: {
    marginTop: THEME.spaceSm,
    backgroundColor: THEME.warningSoft,
    borderRadius: THEME.radiusSm,
    padding: 10,
  },
  reasonText: { fontSize: THEME.fontSm, color: THEME.textSecondary, lineHeight: 20 },
  actionsRow: {
    flexDirection: 'row',
    gap: THEME.spaceSm,
    marginTop: THEME.spaceMd,
    paddingTop: THEME.spaceMd,
    borderTopWidth: 1,
    borderTopColor: THEME.divider,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: THEME.bgMuted,
    paddingVertical: 8,
    borderRadius: THEME.radiusSm,
  },
  quickBtnDisabled: { opacity: 0.45 },
  quickBtnText: { fontSize: THEME.fontXs, fontWeight: '800', color: THEME.textSecondary },
  quickBtnTextDisabled: { color: THEME.textLight },
});
