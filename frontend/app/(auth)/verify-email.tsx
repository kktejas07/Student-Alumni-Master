import { useEffect, useState } from 'react';
import { View, Text, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, XCircle, Loader } from 'lucide-react-native';
import { getBaseUrl } from '@/src/lib/env';
import { WebPrimaryBtn } from '@/src/views/web/AuthWebControls';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';

const BASE = getBaseUrl();

export default function VerifyEmailLink() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/verify-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data?.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data?.detail || 'Invalid or expired verification link.');
        }
      } catch {
        setStatus('error');
        setMessage('Could not connect to the server. Please try again.');
      }
    })();
  }, [token]);

  if (Platform.OS === 'web') {
    return (
      <AuthWebShell title="Email Verification">
        <View style={{ alignItems: 'center', gap: 16, padding: 24 }}>
          {status === 'verifying' && (
            <>
              <Loader size={48} color="#8B5CF6" />
              <Text style={{ color: '#94A3B8', fontSize: 16 }}>Verifying your email...</Text>
            </>
          )}
          {status === 'success' && (
            <>
              <ShieldCheck size={48} color="#22C55E" />
              <Text style={{ color: '#22C55E', fontSize: 20, fontWeight: '700' }}>Email Verified!</Text>
              <Text style={{ color: '#94A3B8', textAlign: 'center' }}>{message}</Text>
              <WebPrimaryBtn label="Continue to Login" onPress={() => router.replace('/(auth)/login' as any)} />
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={48} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: '700' }}>Verification Failed</Text>
              <Text style={{ color: '#94A3B8', textAlign: 'center' }}>{message}</Text>
              <WebPrimaryBtn label="Back to Login" onPress={() => router.replace('/(auth)/login' as any)} />
            </>
          )}
        </View>
      </AuthWebShell>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080B12', padding: 24 }}>
      {status === 'verifying' && (
        <>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ color: '#94A3B8', marginTop: 16 }}>Verifying your email...</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <ShieldCheck size={48} color="#22C55E" />
          <Text style={{ color: '#22C55E', fontSize: 20, fontWeight: '700', marginTop: 16 }}>Email Verified!</Text>
          <Text style={{ color: '#94A3B8', marginTop: 8 }}>{message}</Text>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={48} color="#EF4444" />
          <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: '700', marginTop: 16 }}>Verification Failed</Text>
          <Text style={{ color: '#94A3B8', marginTop: 8 }}>{message}</Text>
        </>
      )}
    </View>
  );
}
