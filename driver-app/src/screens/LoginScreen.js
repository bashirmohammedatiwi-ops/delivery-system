import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e.message || 'فشل تسجيل الدخول');
      Alert.alert('خطأ', e.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* خلفية متدرجة محاكاة */}
      <View style={styles.bgBase} />
      <View style={[styles.bgShape, styles.bgShape1]} />
      <View style={[styles.bgShape, styles.bgShape2]} />
      <View style={[styles.bgShape, styles.bgShape3]} />
      <View style={styles.bgOverlay} />

      <View style={styles.content}>
        <View style={styles.logoBlock}>
          <View style={styles.logoIcon}>
            <Ionicons name="car-outline" size={48} color="#fff" />
          </View>
          <Text style={styles.title}>تطبيق السائق</Text>
          <Text style={styles.subtitle}>شركة ديما الحياة للتوصيل</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={22} color={THEME.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="اسم المستخدم"
              placeholderTextColor={THEME.textLight}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={22} color={THEME.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="كلمة المرور"
              placeholderTextColor={THEME.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {error ? (
            <View style={styles.errorWrap}>
              <Ionicons name="alert-circle" size={18} color={THEME.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>تسجيل الدخول</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.btnIcon} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>تطبيق آمن لإدارة طلبات التوصيل</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.primary,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.primary,
  },
  bgShape: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bgShape1: {
    top: -120,
    right: -80,
    width: 280,
    height: 280,
  },
  bgShape2: {
    top: '40%',
    left: -100,
    width: 200,
    height: 200,
  },
  bgShape3: {
    bottom: 80,
    right: -60,
    width: 160,
    height: 160,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    ...THEME.shadowLg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: THEME.bg,
  },
  inputIcon: {
    marginRight: 14,
    marginLeft: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    textAlign: 'right',
    color: '#0f172a',
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  error: {
    color: THEME.danger,
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: THEME.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 10,
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
});
