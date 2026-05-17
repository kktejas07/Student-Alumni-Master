import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

export default function OAuthCallbackScreen() {
  const [status, setStatus] = useState('Processing sign-in...');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Parse the URL for OAuth tokens
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.replace('#', '');
        const hashParams = new URLSearchParams(hash);

        // Google returns id_token in URL fragment (#id_token=xxx)
        const idToken = hashParams.get('id_token');
        // LinkedIn returns code in URL query (?code=xxx)
        const code = params.get('code');
        // Detect which provider from state parameter
        const state = params.get('state') || hashParams.get('state') || '';

        const provider = state.includes('linkedin') ? 'linkedin' : state.includes('google') ? 'google' : null;

        if (idToken) {
          // Google OAuth
          setStatus('Verifying Google account...');
          const res = await fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken }),
          });
          if (!res.ok) throw new Error('Google verification failed');
          const data = await res.json();
          // Notify parent window and close popup
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', payload: data }, API_BASE);
            window.close();
          } else {
            // Redirect if not a popup
            const role = (data.user?.role || '').toLowerCase();
            const routes: Record<string, string> = { admin: '/super-admin', mentor: '/mentor-portal', college: '/college-portal', alumni: '/alumni-portal' };
            window.location.href = routes[role] || '/student-portal';
          }
        } else if (code) {
          // LinkedIn OAuth
          setStatus('Verifying LinkedIn account...');
          const res = await fetch(`${API_BASE}/api/auth/linkedin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: code }),
          });
          if (!res.ok) throw new Error('LinkedIn verification failed');
          const data = await res.json();
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', payload: data }, API_BASE);
            window.close();
          } else {
            const role = (data.user?.role || '').toLowerCase();
            const routes: Record<string, string> = { admin: '/super-admin', mentor: '/mentor-portal', college: '/college-portal', alumni: '/alumni-portal' };
            window.location.href = routes[role] || '/student-portal';
          }
        } else {
          setError('No authorization code received from provider.');
        }
      } catch (e: any) {
        setError(e?.message || 'OAuth sign-in failed. Please try again.');
      }
    })();
  }, []);

  // Listen for OAuth result from popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_SUCCESS') {
        const data = event.data.payload;
        // Store tokens and redirect
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        const role = (data.user?.role || '').toLowerCase();
        const routes: Record<string, string> = { admin: '/super-admin', mentor: '/mentor-portal', college: '/college-portal', alumni: '/alumni-portal' };
        window.location.href = routes[role] || '/student-portal';
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (error) {
    return (
      <View style={s.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={s.errorText}>{error}</Text>
        <Text style={s.hintText}>Close this window and try again.</Text>
      </View>
    );
  }

  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#F59E0B" />
      <Text style={s.statusText}>{status}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  statusText: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 15, marginTop: 16 },
  errorText: { color: '#ef4444', fontFamily: FONTS.xbold, fontSize: 16, marginTop: 12, textAlign: 'center' },
  hintText: { color: '#64748b', fontFamily: FONTS.med, fontSize: 13, marginTop: 8, textAlign: 'center' },
});
