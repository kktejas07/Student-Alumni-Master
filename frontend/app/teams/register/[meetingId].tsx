/**
 * /teams/register/{meetingId} — Public registration page for Teams meetings.
 *
 * Non-logged-in users (or anyone with the link) land here to provide their
 * full name, email, and phone number before joining a Teams meeting.
 * Seat limits are enforced server-side.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, Clock, Users, Check, AlertCircle } from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

export default function TeamsMeetingRegisterPage() {
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [icsText, setIcsText] = useState('');
  const [icsFilename, setIcsFilename] = useState('teams-meeting.ics');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const addToCalendar = () => {
    if (icsText && typeof window !== 'undefined') {
      const blob = new Blob([icsText], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = icsFilename || 'teams-meeting.ics';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const decodeB64 = (b64: string) => {
    try {
      if (typeof window !== 'undefined' && window.atob) {
        const bin = window.atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
      }
    } catch {}
    return b64;
  };

  useEffect(() => {
    if (!meetingId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/integrations/teams/meetings/${meetingId}`);
        if (!res.ok) throw new Error('Meeting not found');
        const json = await res.json();
        setMeeting(json);
      } catch (e: any) {
        setError(e?.message || 'Could not load meeting.');
      } finally {
        setLoading(false);
      }
    })();
  }, [meetingId]);

  const handleSubmit = async () => {
    if (!form.full_name || !form.email) {
      alert('Name and email are required.');
      return;
    }
    if (!meeting) return;

    setRegistering(true);
    try {
      const res = await fetch(`${API_BASE}/api/integrations/teams/meetings/${meeting.meeting_id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        if (json.ics) setIcsText(decodeB64(json.ics));
        setIcsFilename(json.ics_filename || 'teams-meeting.ics');
        // Open join URL in new tab
        if (json.join_url && typeof window !== 'undefined') {
          setTimeout(() => { window.open(json.join_url, '_blank'); }, 1500);
        }
      } else {
        setError(json.error || 'Registration failed.');
      }
    } catch (e: any) {
      setError(e?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <View style={s.root}>
        <EchoHeader />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View style={[s.content, { alignItems: 'center', paddingVertical: 80 }]}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={s.centerText}>Loading meeting details…</Text>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  if (error && !meeting) {
    return (
      <View style={s.root}>
        <EchoHeader />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View style={[s.content, { alignItems: 'center', paddingVertical: 80 }]}>
            <AlertCircle size={48} color="#F87186" />
            <Text style={[s.centerText, { color: '#F87186' }]}>{error}</Text>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  if (success && meeting) {
    return (
      <View style={s.root}>
        <EchoHeader />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View style={s.content}>
            <LinearGradient
              colors={['rgba(16,185,129,0.25)', 'rgba(30,10,80,0.4)', '#0a0f1e']}
              style={s.successCard}
            >
              <View style={s.successIcon}>
                <Check size={44} color="#34D399" />
              </View>
              <Text style={s.successTitle}>Registration Successful!</Text>
              <Text style={s.successSub}>Your seat is reserved.</Text>
              {meeting.join_url && (
                <Pressable
                  onPress={() => window.open(meeting.join_url, '_blank')}
                  style={s.joinBtn}
                >
                  <Video size={16} color="#fff" />
                  <Text style={s.joinBtnText}>Join on Microsoft Teams</Text>
                </Pressable>
              )}
              {icsText && (
                <Pressable onPress={addToCalendar} style={s.calBtn}>
                  <Clock size={16} color="#fff" />
                  <Text style={s.joinBtnText}>Add to Calendar</Text>
                </Pressable>
              )}
              <Text style={s.calHint}>
                A calendar invitation has also been emailed to you. Add it to your calendar so the meeting shows up with the join link.
              </Text>
            </LinearGradient>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <EchoHeader />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View style={s.content}>
          {/* Meeting Header */}
          <LinearGradient
            colors={['rgba(124,58,237,0.2)', 'rgba(30,10,80,0.3)']}
            style={s.meetingCard}
          >
            <View style={s.meetingHeader}>
            <Video size={28} color="#A78BFA" />
            <Text style={s.meetingTitle}>{meeting?.subject || 'Teams Meeting'}</Text>
            </View>
            {meeting?.description && (
              <Text style={s.meetingDesc}>{meeting.description}</Text>
            )}
            <View style={s.metaRow}>
              <Clock size={14} color="rgba(255,255,255,0.6)" />
              <Text style={s.metaText}>{formatDate(meeting?.start_time || new Date().toISOString())}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaText}>{meeting?.duration_minutes || 60} min · Microsoft Teams</Text>
            </View>
            {meeting?.seat_limit && (
              <View style={s.metaRow}>
                <Users size={14} color="rgba(255,255,255,0.6)" />
                <Text style={s.metaText}>
                  {meeting.registrations?.length || 0}/{meeting.seat_limit} registered
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Registration Form */}
          <View style={s.formCard}>
            <Text style={s.formTitle}>Register to join</Text>
            <Text style={s.formSub}>Enter your details to receive the meeting link and secure your seat.</Text>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Full Name *</Text>
              <TextInput
                placeholder="Your full name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={s.input}
                value={form.full_name}
                onChangeText={(t) => setForm({ ...form, full_name: t })}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Email Address *</Text>
              <TextInput
                placeholder="you@college.edu"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={s.input}
                value={form.email}
                onChangeText={(t) => setForm({ ...form, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Phone Number</Text>
              <TextInput
                placeholder="+91 98765 43210"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={s.input}
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                keyboardType="phone-pad"
              />
            </View>

            {error && (
              <View style={s.errorRow}>
                <AlertCircle size={12} color="#F87186" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={registering || !form.full_name || !form.email}
              style={[s.submitBtn, registering && { opacity: 0.6 }]}
            >
              {registering ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Video size={16} color="#fff" />
              )}
              <Text style={s.submitBtnText}>
                {registering ? 'Registering...' : 'Reserve My Seat'}
              </Text>
            </Pressable>
          </View>
        </View>
        <EchoFooter />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f1e' },
  content: { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center', gap: 16 },
  centerText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  meetingCard: {
    borderRadius: 18, padding: 24, gap: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  meetingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  meetingTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 20, flex: 1 },
  meetingDesc: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_500Medium', fontSize: 12 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)', padding: 24, gap: 16,
  },
  formTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 18, letterSpacing: -0.2 },
  formSub: { color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 20 },
  inputGroup: { gap: 6 },
  inputLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: '#fff',
    fontFamily: 'DMSans_500Medium', fontSize: 15,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: 'rgba(248,113,134,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(248,113,134,0.3)' },
  errorText: { color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 14,
  },
  submitBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14.5 },
  successCard: { borderRadius: 18, padding: 40, gap: 16, alignItems: 'center', textAlign: 'center' },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 24 },
  successSub: { color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#5B4FE9', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  joinBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(91,79,233,0.35)', borderWidth: 1, borderColor: '#5B4FE9', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 6 },
  calHint: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 8, paddingHorizontal: 10 },
  centerText2: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
});
