import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function DateNavigator({ label, onPrev, onNext, canGoNext = true }) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.btn} onPress={onPrev} activeOpacity={0.85}>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
        <Text style={styles.btnText}>السابق</Text>
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, !canGoNext && styles.btnDisabled]}
        onPress={onNext}
        disabled={!canGoNext}
        activeOpacity={0.85}
      >
        <Text style={[styles.btnText, !canGoNext && styles.btnTextDisabled]}>التالي</Text>
        <Ionicons name="chevron-back" size={18} color={canGoNext ? '#fff' : THEME.textLight} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    gap: THEME.spaceSm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: THEME.radiusSm,
  },
  btnDisabled: { backgroundColor: THEME.border },
  btnText: { color: '#fff', fontSize: THEME.fontSm, fontWeight: '700' },
  btnTextDisabled: { color: THEME.textLight },
  center: { flex: 1, alignItems: 'center' },
  label: { fontSize: THEME.fontMd, fontWeight: '800', color: THEME.text },
});
