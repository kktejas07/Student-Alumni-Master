/**
 * Login screen
 */
import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, Input } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const C = Colors.light;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    try {
      const user = await login(email.trim(), password);
      if (!user.onboarding_completed) {
        router.replace('/(onboarding)/role-info');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="login-back-btn" style={styles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue your career journey.</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              testID="login-email-input"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Your password"
              testID="login-password-input"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Log in"
              onPress={onSubmit}
              loading={loading}
              testID="login-submit-btn"
              style={{ marginTop: Spacing.md }}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              testID="login-go-register-btn"
              style={styles.switch}
            >
              <Text style={styles.switchText}>
                Don't have an account?{' '}
                <Text style={{ color: C.accentPink, fontFamily: 'Manrope_600SemiBold' }}>
                  Sign up
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, gap: Spacing.md },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  h1: { ...Typography.h2, color: C.textPrimary, marginTop: Spacing.md },
  subtitle: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.lg },
  form: { gap: Spacing.md },
  error: { ...Typography.bodySm, color: C.danger },
  switch: { alignItems: 'center', marginTop: Spacing.lg },
  switchText: { ...Typography.body, color: C.textSecondary },
});
