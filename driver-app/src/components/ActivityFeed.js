import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { formatIQD } from '../utils/format';

function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityFeed({ items, onPressItem }) {
  if (!items?.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>آخر النشاط</Text>
      {items.slice(0, 5).map((item) => (
        <TouchableOpacity
          key={String(item.OrderID)}
          style={styles.row}
          onPress={() => onPressItem?.(item)}
          activeOpacity={0.8}
        >
          <View style={[styles.dot, item.type === 'returned' ? styles.dotRed : styles.dotGreen]} />
          <View style={styles.body}>
            <Text style={styles.shipment}>#{item.ShipmentNumber}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {item.type === 'returned' ? 'مرتجع' : 'تم التوصيل'} • {item.CustomerName || '—'}
            </Text>
          </View>
          <View style={styles.meta}>
            {item.type !== 'returned' ? (
              <Text style={styles.amount}>{formatIQD(item.TotalIQD)}</Text>
            ) : null}
            <Text style={styles.time}>{formatTime(item.DeliveredDate || item.ReturnedDate)}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceXl,
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  title: { fontSize: THEME.fontMd, fontWeight: '900', color: THEME.text, marginBottom: THEME.spaceMd },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: THEME.spaceSm },
  dotGreen: { backgroundColor: THEME.success },
  dotRed: { backgroundColor: THEME.danger },
  body: { flex: 1 },
  shipment: { fontSize: THEME.fontSm, fontWeight: '900', color: THEME.text },
  sub: { fontSize: THEME.fontXs, color: THEME.textMuted, marginTop: 2, fontWeight: '600' },
  meta: { alignItems: 'flex-end' },
  amount: { fontSize: THEME.fontXs, fontWeight: '800', color: THEME.success },
  time: { fontSize: 10, color: THEME.textLight, marginTop: 2, fontWeight: '600' },
});
