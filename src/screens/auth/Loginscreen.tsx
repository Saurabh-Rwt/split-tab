import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Typography, Spacing, Radius } from '../../constants/colors';
import { RootStackParamList } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store';
import { loginUser, selectUser } from '../../store/slices/authSlice';
import { MOCK_CREDENTIALS } from '../../constants/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;


export const LoginScreen = () => {
  const navigation = useNavigation<Nav>();
  const dispatch   = useAppDispatch();
  const user       = useAppSelector(selectUser);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  //Validate + dispatch login
  const handleLogin = async () => {
    if (
      email.trim().toLowerCase() !== MOCK_CREDENTIALS.email ||
      password !== MOCK_CREDENTIALS.password
    ) {
      Alert.alert(
        'Login Failed',
        `Incorrect credentials.\n\nDemo account:\nEmail: ${MOCK_CREDENTIALS.email}\nPassword: ${MOCK_CREDENTIALS.password}`,
      );
      return;
    }

    if (!user) {
      Alert.alert(
        'Profile Missing',
        'Complete onboarding first.',
        [{ text: 'Go to Onboarding', onPress: () => navigation.replace('Onboarding') }],
      );
      return;
    }

    setLoading(true);
    await dispatch(loginUser(user));
    setLoading(false);
  };

  // Fill demo credentials with one tap
  const fillDemo = () => {
    setEmail(MOCK_CREDENTIALS.email);
    setPassword(MOCK_CREDENTIALS.password);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>💰</Text>
            <Text style={styles.logoText}>SplitTab</Text>
          </View>

          {/* Greeting */}
          <Text style={styles.title}>
            Welcome back{user?.name ? `,\n${user.name}` : ''} 👋
          </Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Demo credentials hint */}
          <TouchableOpacity style={styles.demoBox} onPress={fillDemo} activeOpacity={0.7}>
            <Text style={styles.demoTitle}>🚀 Tap to fill demo credentials</Text>
            <Text style={styles.demoLine}>Email:    {MOCK_CREDENTIALS.email}</Text>
            <Text style={styles.demoLine}>Password: {MOCK_CREDENTIALS.password}</Text>
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass(v => !v)}>
                  <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}>
            <Text style={styles.loginBtnText}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

//  Styles
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  flex:    { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },

  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoEmoji:  { fontSize: 28 },
  logoText:   { fontSize: Typography.lg, fontWeight: Typography.extrabold, color: Colors.primary },

  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    lineHeight: 36,
    marginTop: Spacing.xl,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
  },

  demoBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    gap: 4,
  },
  demoTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  demoLine: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  form:       { gap: Spacing.md },
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
  passwordWrap:  { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.base,
    top: 0, bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 18 },

  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
});