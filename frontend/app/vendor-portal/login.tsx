import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { request } from '@/src/models/services/api';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function VendorLoginScreen() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useVendorAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!vendorId || !passcode) {
      setError('Please enter both Vendor ID and Passcode');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await request<any>('/vendors/login', {
        method: 'POST',
        body: { vendor_id: vendorId, passcode },
      });

      if (res.success && res.token) {
        login(res.token, res.vendor);
        router.replace('/vendor-portal/dashboard');
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <LinearGradient
        pointerEvents="none"
        colors={['#08080F', '#0C0E1F', '#08080F']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <View style={{ width: '100%', maxWidth: 400, backgroundColor: 'rgba(255,255,255,0.03)', padding: 32, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 8, textAlign: 'center' }}>Vendor Portal</Text>
        <Text style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 32, textAlign: 'center' }}>Sign in to manage your orders</Text>

        {error ? (
          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8, marginBottom: 20 }}>
            <Text style={{ color: '#EF4444', fontSize: 14, textAlign: 'center' }}>{error}</Text>
          </View>
        ) : null}

        <Text style={{ color: '#D1D5DB', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Vendor ID</Text>
        <TextInput
          value={vendorId}
          onChangeText={setVendorId}
          placeholder="e.g. tastytacos"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
            color: '#FFF',
            fontSize: 16,
            marginBottom: 20
          }}
        />

        <Text style={{ color: '#D1D5DB', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Passcode</Text>
        <TextInput
          value={passcode}
          onChangeText={setPasscode}
          placeholder="••••"
          placeholderTextColor="#6B7280"
          secureTextEntry
          keyboardType="number-pad"
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
            color: '#FFF',
            fontSize: 16,
            marginBottom: 32
          }}
        />

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: '#8B5CF6',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
