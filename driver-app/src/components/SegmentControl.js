import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEME } from '../theme';

export default function SegmentControl({ options, value, onChange }) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
            {opt.count != null ? (
              <View style={[styles.count, active && styles.countActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{opt.count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: THEME.bgMuted,
    borderRadius: THEME.radiusMd,
    padding: 4,
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: THEME.radiusSm,
  },
  itemActive: {
    backgroundColor: THEME.bgCard,
    ...THEME.shadowSm,
  },
  label: {
    fontSize: THEME.fontSm,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  labelActive: {
    color: THEME.primaryDark,
    fontWeight: '800',
  },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countActive: { backgroundColor: THEME.primarySoft },
  countText: { fontSize: 11, fontWeight: '800', color: THEME.textMuted },
  countTextActive: { color: THEME.primaryDark },
});
