import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { THEME } from '../theme';

const STEPS = [
  { icon: 'scan', title: 'استلام الطلب', text: 'امسح باركود الشحنة أو أدخل الرقم يدوياً من تبويب الاستلام' },
  { icon: 'navigate', title: 'التوصيل', text: 'اضغط «خريطة» أو «اتصال» من بطاقة الطلب للوصول للزبون' },
  { icon: 'checkmark-circle', title: 'تأكيد التوصيل', text: 'من تفاصيل الطلب اضغط «توصيل» بعد تسليم الطلب' },
  { icon: 'pause-circle', title: 'التأجيل', text: 'إذا لم تستطع التوصيل اليوم، أجّل الطلب مع كتابة السبب' },
  { icon: 'return-up-back', title: 'الإرجاع', text: 'إذا رفض الزبون، سجّل سبب الإرجاع من تفاصيل الطلب' },
  { icon: 'search', title: 'البحث', text: 'ابحث برقم الشحنة أو اسم العميل أو العنوان في «طلباتي»' },
];

export default function HelpScreen({ onBack }) {
  return (
    <View style={styles.container}>
      <AppHeader title="دليل الاستخدام" subtitle="خطوات سريعة للسائق" onBack={onBack} compact />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="help-buoy" size={40} color={THEME.primary} />
          <Text style={styles.heroTitle}>كيف تستخدم التطبيق؟</Text>
          <Text style={styles.heroSub}>اتبع هذه الخطوات لإنجاز يومك بسلاسة</Text>
        </View>
        {STEPS.map((step, i) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <View style={styles.stepIcon}>
              <Ionicons name={step.icon} size={20} color={THEME.primary} />
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: THEME.spaceLg, paddingBottom: THEME.space3xl },
  hero: {
    alignItems: 'center',
    backgroundColor: THEME.primarySoft,
    borderRadius: THEME.radiusXl,
    padding: THEME.space2xl,
    marginBottom: THEME.spaceLg,
  },
  heroTitle: { fontSize: THEME.fontXl, fontWeight: '900', color: THEME.text, marginTop: THEME.spaceMd },
  heroSub: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 4, textAlign: 'center' },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceMd,
    marginBottom: THEME.spaceSm,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spaceSm,
  },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spaceSm,
  },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: THEME.fontMd, fontWeight: '900', color: THEME.text },
  stepText: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 4, lineHeight: 20, fontWeight: '600' },
});
