import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function LoginScreen() {
  const { login, savedUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (savedUsername) setUsername(savedUsername);
  }, [savedUsername]);

  async function handleLogin() {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password, rememberMe);
    } catch (e) {
      setError(e.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.bgTop} />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <View style={styles.logoWrap}>
            <Ionicons name="car-sport" size={44} color="#fff" />
          </View>
          <Text style={styles.brandTitle}>تطبيق السائق</Text>
          <Text style={styles.brandSub}>شركة ديما الحياة للتوصيل</Text>
          <View style={styles.featureRow}>
            <FeaturePill icon="scan-outline" text="مسح سريع" />
            <FeaturePill icon="stats-chart-outline" text="إحصائيات" />
            <FeaturePill icon="shield-checkmark-outline" text="آمن" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تسجيل الدخول</Text>
          <Text style={styles.cardSub}>أدخل بيانات حسابك للمتابعة</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color={THEME.textMuted} />
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
            <Ionicons name="lock-closed-outline" size={20} color={THEME.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="كلمة المرور"
              placeholderTextColor={THEME.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.8}>
            <Ionicons name={rememberMe ? 'checkbox' : 'square-outline'} size={22} color={rememberMe ? THEME.primary : THEME.textLight} />
            <Text style={styles.rememberText}>تذكر اسم المستخدم</Text>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={THEME.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>دخول</Text>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>إدارة احترافية لطلبات التوصيل</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function FeaturePill({ icon, text }) {
  return (
    <View style={styles.featurePill}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.9)" />
      <Text style={styles.featurePillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.primaryDeeper },
  bgTop: { ...StyleSheet.absoluteFillObject, backgroundColor: THEME.primaryDeeper },
  bgCircle1: {
    position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bgCircle2: {
    position: 'absolute', bottom: 100, left: -70, width: 180, height: 180, borderRadius: 999,
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  bgCircle3: {
    position: 'absolute', top: '35%', left: -40, width: 120, height: 120, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  content: { flex: 1, justifyContent: 'center', padding: THEME.space2xl },
  brandBlock: { alignItems: 'center', marginBottom: THEME.space2xl },
  logoWrap: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center', marginBottom: THEME.spaceLg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  brandTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 6 },
  brandSub: { fontSize: THEME.fontMd, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: THEME.spaceMd },
  featureRow: { flexDirection: 'row', gap: THEME.spaceSm, flexWrap: 'wrap', justifyContent: 'center' },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: THEME.radiusFull,
  },
  featurePillText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  card: {
    backgroundColor: THEME.bgCard, borderRadius: THEME.radiusXl, padding: THEME.space2xl, ...THEME.shadowLg,
  },
  cardTitle: { fontSize: THEME.fontXl, fontWeight: '900', color: THEME.text, textAlign: 'center' },
  cardSub: { fontSize: THEME.fontSm, color: THEME.textMuted, textAlign: 'center', marginTop: 4, marginBottom: THEME.spaceXl },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: THEME.border, borderRadius: THEME.radiusMd,
    paddingHorizontal: THEME.spaceMd, marginBottom: THEME.spaceMd, backgroundColor: THEME.bgMuted,
  },
  input: {
    flex: 1, paddingVertical: 14, fontSize: THEME.fontMd, textAlign: 'right', color: THEME.text, fontWeight: '600',
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: THEME.spaceMd },
  rememberText: { fontSize: THEME.fontSm, color: THEME.textSecondary, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.dangerSoft, padding: THEME.spaceSm, borderRadius: THEME.radiusSm, marginBottom: THEME.spaceMd,
  },
  errorText: { flex: 1, color: THEME.danger, fontSize: THEME.fontSm, fontWeight: '700', textAlign: 'right' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: THEME.primary, borderRadius: THEME.radiusMd, paddingVertical: 16, marginTop: THEME.spaceSm, ...THEME.shadowMd,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: THEME.fontLg, fontWeight: '900' },
  footer: {
    marginTop: THEME.space2xl, textAlign: 'center', fontSize: THEME.fontSm,
    color: 'rgba(255,255,255,0.65)', fontWeight: '600',
  },
});
