/**
 * Contact - stub page (shared web + mobile). Simple form + company info.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Mail, MapPin, Phone, Send } from 'lucide-react-native';
import { Colors as C, Typography, Spacing, Radius } from '@/src/theme';
import { Button, GradientBackground } from '@/src/views/components';

export default function ContactPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!form.name || !form.email || !form.message) {
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-undef
        (globalThis as any).alert?.('Please fill all fields');
      } else {
        Alert.alert('Missing info', 'Please fill all fields');
      }
      return;
    }
    setSending(true);
    // Simulate submission — replace with /api/contact endpoint later
    await new Promise((r) => setTimeout(r, 700));
    setSending(false);
    setSent(true);
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <GradientBackground colors={['#3D1468', '#5F259F'] as const}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={18} color={C.white} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.headerRow}>
            <View style={styles.iconBubble}>
              <MessageCircle size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Get in Touch</Text>
              <Text style={styles.sub}>
                Questions, partnerships, or feedback — we’d love to hear from you.
              </Text>
            </View>
          </View>

          <View style={[styles.contactGrid]}>
            <InfoTile icon={Mail} label="Email" value="hello@studentalumni.com" />
            <InfoTile icon={Phone} label="Phone" value="+91 80-4567-8910" />
            <InfoTile icon={MapPin} label="HQ" value="Bengaluru, India" />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Send us a message</Text>

            <Field
              label="Your Name"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              placeholder="Aanya Sharma"
            />
            <Field
              label="Email"
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
              placeholder="you@college.edu"
              keyboardType="email-address"
            />
            <Field
              label="Message"
              value={form.message}
              onChangeText={(t) => setForm({ ...form, message: t })}
              placeholder="Tell us how we can help..."
              multiline
            />

            <View style={{ height: 12 }} />
            <Button
              title={sent ? 'Sent! We\u2019ll be in touch' : sending ? 'Sending...' : 'Send Message'}
              onPress={submit}
              loading={sending}
              icon={!sent ? <Send size={16} color={C.white} /> : undefined}
              variant={sent ? 'glass' : 'primary'}
            />
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoIcon}>
        <Icon size={18} color={C.white} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: Spacing.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  backText: { ...Typography.bodyBold, color: C.white },
  headerRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 8 },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: { ...Typography.h1, color: C.white, fontSize: 30 },
  sub: { ...Typography.body, color: C.textOnPurpleMuted, marginTop: 4 },

  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: Spacing.lg,
  },
  infoTile: {
    flexBasis: 220,
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 6,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  infoLabel: { ...Typography.label, color: C.textOnPurpleMuted, fontSize: 11 },
  infoValue: { ...Typography.bodyBold, color: C.white },

  formCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  formTitle: { ...Typography.h3, color: C.white },
  fieldLabel: { ...Typography.label, color: C.textOnPurpleMuted, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: C.white,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
});
