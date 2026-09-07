import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { formatIQD } from '../utils/format';

export default function OrdersSummaryBar({ count, totalIQD, amountDue }) {
  if (!count) return null;
  return (
    <View style={styles.bar}>
      <View style={styles.item}>
        <Ionicons name="layers-outline" size={16} color={THEME.primary} />
        <Text style={styles.itemText}>{count} طلب</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Ionicons name="cash-outline" size={16} color={THEME.success} />
        <Text style={styles.itemText}>{formatIQD(totalIQD)}</Text>
      </View>
      {amountDue != null ? (
        <>
          <View style={styles.divider} />
          <View style={styles.item}>
            <Ionicons name="wallet-outline" size={16} color={THEME.accentBlue} />
            <Text style={styles.itemText}>مستحق {formatIQD(amountDue)}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    backgroundColor: THEME.primaryDeeper,
    borderRadius: THEME.radiusLg,
    paddingVertical: 12,
    paddingHorizontal: THEME.spaceSm,
    ...THEME.shadowMd,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  itemText: { fontSize: THEME.fontXs, fontWeight: '800', color: '#fff' },
  divider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
});
