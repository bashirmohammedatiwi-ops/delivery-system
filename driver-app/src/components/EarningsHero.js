import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { formatIQD } from '../utils/format';

export default function EarningsHero({ delivered, returned, totalDue, onPressStats }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPressStats} activeOpacity={0.9}>
      <View style={styles.bgCircle} />
      <View style={styles.top}>
        <View>
          <Text style={styles.label}>ملخص اليوم</Text>
          <Text style={styles.dueLabel}>المبلغ المستحق</Text>
          <Text style={styles.dueValue}>{formatIQD(totalDue)}</Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons name="trending-up" size={28} color="#fff" />
        </View>
      </View>
      <View style={styles.bottom}>
        <MiniStat icon="checkmark-circle" label="موصّل" value={delivered} />
        <MiniStat icon="close-circle" label="مرتجع" value={returned} />
        <View style={styles.cta}>
          <Text style={styles.ctaText}>عرض التفاصيل</Text>
          <Ionicons name="chevron-back" size={16} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <View style={styles.mini}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.85)" />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceLg,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    backgroundColor: THEME.primaryDeeper,
    overflow: 'hidden',
    ...THEME.shadowLg,
  },
  bgCircle: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: THEME.fontSm, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
  dueLabel: { fontSize: THEME.fontXs, color: 'rgba(255,255,255,0.65)', marginTop: 8, fontWeight: '600' },
  dueValue: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: THEME.spaceLg,
    paddingTop: THEME.spaceMd,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  mini: { flex: 1, alignItems: 'center' },
  miniValue: { fontSize: THEME.fontLg, fontWeight: '900', color: '#fff', marginTop: 2 },
  miniLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.radiusFull,
  },
  ctaText: { fontSize: THEME.fontXs, color: '#fff', fontWeight: '800' },
});
