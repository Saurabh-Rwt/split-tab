import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uuid from 'react-native-uuid';

import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import { Currency, AvatarColor, User, RootStackParamList } from '../types';
import { useAppDispatch } from '../store';
import { saveUserProfile } from '../store/slices/authSlice';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

// ─────────────────────────────────────────────────────────────

const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

const AVATAR_COLORS = Colors.avatarColors as unknown as AvatarColor[];
const STEPS = ['Welcome', 'Your Info', 'Currency', 'Avatar'];

// ─────────────────────────────────────────────────────────────

export const OnboardingScreen = () => {
  const navigation = useNavigation<Nav>();
  const dispatch   = useAppDispatch();

  const [step,        setStep]        = useState(0);
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [currency,    setCurrency]    = useState<Currency>('INR');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
  const [loading,     setLoading]     = useState(false);

  // Per-step validation
  const canContinue =
    step !== 1 || (name.trim().length >= 2 && email.includes('@'));

  // Handle next / finish
  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      return;
    }

    setLoading(true);

    const user: User = {
      id:              uuid.v4() as string,
      name:            name.trim(),
      email:           email.trim().toLowerCase(),
      displayCurrency: currency,
      avatarColor,
      createdAt:       new Date().toISOString(),
    };

    // Dispatch Redux thunk, saves to AsyncStorage
    await dispatch(saveUserProfile(user));

    setLoading(false);
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step   && styles.dotDone,
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <View style={styles.center}>
              <Text style={styles.bigEmoji}>💰</Text>
              <Text style={styles.title}>Welcome to{'\n'}SplitTab</Text>
              <Text style={styles.subtitle}>
                Split group expenses, track balances,{'\n'}
                and settle up with minimal payments.
              </Text>
              <View style={styles.featureList}>
                {[
                  '4 flexible split types',
                  'Live currency conversion',
                  'Smart debt simplification',
                ].map(f => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureDot}>✦</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 1: Name & Email ── */}
          {step === 1 && (
            <View style={styles.center}>
              <Text style={styles.title}>Who are you?</Text>
              <Text style={styles.subtitle}>
                Friends will see this name in your shared groups.
              </Text>

              <View style={styles.fields}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Display Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Arjun Mehta"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                    autoFocus
                    maxLength={30}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={60}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ── Step 2: Currency ── */}
          {step === 2 && (
            <View style={styles.center}>
              <Text style={styles.title}>Display Currency</Text>
              <Text style={styles.subtitle}>
                All amounts will be converted to this currency.{'\n'}
                You can change it later in your profile.
              </Text>

              <View style={styles.currencyGrid}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.currencyCard, currency === c.code && styles.currencyCardActive]}
                    onPress={() => setCurrency(c.code)}
                    activeOpacity={0.8}>
                    <Text style={styles.currencySymbol}>{c.symbol}</Text>
                    <Text style={styles.currencyCode}>{c.code}</Text>
                    <Text style={styles.currencyName}>{c.name}</Text>
                    {currency === c.code && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkTick}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 3: Avatar Color ── */}
          {step === 3 && (
            <View style={styles.center}>
              <Text style={styles.title}>Pick Your Color</Text>
              <Text style={styles.subtitle}>
                This represents you across all groups.
              </Text>

              {/* Live preview */}
              <View style={[styles.avatarPreview, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarInitial}>
                  {name.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>

              <View style={styles.colorGrid}>
                {AVATAR_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      avatarColor === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setAvatarColor(color)}
                    activeOpacity={0.85}
                  />
                ))}
              </View>
            </View>
          )}

        </ScrollView>

        {/* Footer buttons */}
        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep(s => s - 1)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              !canContinue && styles.nextBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={!canContinue || loading}
            activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>
              {loading
                ? 'Saving…'
                : step === STEPS.length - 1
                ? 'Get Started →'
                : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  dot:       { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.border },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  dotDone:   { backgroundColor: Colors.primaryDark },

  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  center: { alignItems: 'center', gap: Spacing.lg },

  bigEmoji: { fontSize: 72 },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  featureList: { gap: Spacing.sm, width: '100%', marginTop: Spacing.sm },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureDot:  { color: Colors.primary, fontSize: Typography.sm, fontWeight: Typography.bold },
  featureText: { fontSize: Typography.sm, color: Colors.textSecondary },

  fields:     { width: '100%', gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },

  currencyGrid: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  currencyCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: 4,
  },
  currencyCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryDark + '28',
  },
  currencySymbol: { fontSize: Typography.xl, fontWeight: Typography.extrabold, color: Colors.textPrimary },
  currencyCode:   { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  currencyName:   { fontSize: Typography.xs, color: Colors.textSecondary, textAlign: 'center' },
  checkBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkTick: { color: '#fff', fontSize: 10, fontWeight: Typography.bold },

  avatarPreview: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarInitial: { fontSize: Typography.xl, fontWeight: Typography.extrabold, color: '#fff' },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  colorSwatch:         { width: 52, height: 52, borderRadius: 26 },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },

  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
  backBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: Colors.textSecondary, fontWeight: Typography.medium, fontSize: Typography.base },
  nextBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold },
});