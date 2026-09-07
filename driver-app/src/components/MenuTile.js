import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function MenuTile({ icon, iconColor, iconBg, title, subtitle, onPress, badge }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg || THEME.primarySoft }]}>
        <Ionicons name={icon} size={24} color={iconColor || THEME.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {badge != null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-back" size={20} color={THEME.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: THEME.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spaceMd,
  },
  textWrap: { flex: 1 },
  title: { fontSize: THEME.fontMd, fontWeight: '800', color: THEME.text, marginBottom: 2 },
  subtitle: { fontSize: THEME.fontSm, color: THEME.textMuted, lineHeight: 18 },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginHorizontal: THEME.spaceSm,
  },
  badgeText: { color: '#fff', fontSize: THEME.fontSm, fontWeight: '800' },
});
