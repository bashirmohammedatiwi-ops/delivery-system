import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function AppHeader({
  title,
  subtitle,
  badge,
  onBack,
  rightAction,
  compact = false,
  dark = true,
  children,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, dark && styles.wrapDark, { paddingTop: insets.top + (compact ? 8 : 14) }]}>
      <View style={styles.gradientLayer1} />
      <View style={styles.gradientLayer2} />
      <View style={styles.gridPattern} />

      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        <View style={styles.titleBlock}>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>

        {rightAction ? (
          <TouchableOpacity style={styles.iconBtn} onPress={rightAction.onPress} activeOpacity={0.8}>
            <Ionicons name={rightAction.icon} size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: THEME.spaceLg,
    paddingBottom: THEME.spaceLg,
    overflow: 'hidden',
    position: 'relative',
  },
  wrapDark: {
    backgroundColor: THEME.primaryDeeper,
  },
  gradientLayer1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gradientLayer2: {
    position: 'absolute',
    bottom: -30,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.04,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spaceSm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: THEME.radiusSm,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconPlaceholder: { width: 44 },
  titleBlock: { flex: 1, alignItems: 'center' },
  badge: {
    fontSize: THEME.fontXs,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: THEME.fontXl,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: THEME.fontSm,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
    fontWeight: '600',
  },
  children: { marginTop: THEME.spaceMd },
});
