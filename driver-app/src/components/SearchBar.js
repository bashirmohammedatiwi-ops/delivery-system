import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function SearchBar({ value, onChangeText, placeholder = 'بحث...', onClear }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={20} color={THEME.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.textLight}
        textAlign="right"
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => (onClear ? onClear() : onChangeText(''))} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={THEME.textLight} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusMd,
    paddingHorizontal: THEME.spaceMd,
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.border,
    ...THEME.shadowSm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: THEME.fontMd,
    color: THEME.text,
    fontWeight: '600',
  },
});
