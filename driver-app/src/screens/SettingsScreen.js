import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';

export default function SettingsScreen() {
  const { driver, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل تريد تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الخروج', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={40} color={THEME.primary} />
        </View>
        <Text style={styles.label}>اسم السائق</Text>
        <Text style={styles.driverName}>{driver?.DriverName || '—'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={22} color="#fff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>تطبيق السائق • شركة ديما الحياة</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    padding: 24,
  },
  profileCard: {
    backgroundColor: THEME.bgCard,
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: THEME.textMuted,
    marginBottom: 8,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: THEME.danger,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: { marginLeft: 10 },
  logoutText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 13,
    color: THEME.textLight,
  },
});
