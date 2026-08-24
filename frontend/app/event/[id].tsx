/**
 * Event Detail Screen with QR Registration
 * ==========================================
 * Spec: students register for events and get a QR code for venue check-in.
 * Backend (POST /events/:id/register) generates a unique QR per registration.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Check } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Card, Button } from '@/src/views/components';
import { api } from '@/src/models/services/api';

export default function EventDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Check if already registered on mount
  useEffect(() => {
    if (params.id) {
      api.myEventRegistration(String(params.id))
        .then((res) => {
          if (res?.qr_code_base64) setRegistration(res);
        })
        .catch(() => {});
    }
  }, [params.id]);

  /** Register for the event and receive a QR code. */
  const register = async () => {
    setLoading(true);
    try {
      const res = await api.registerEvent(String(params.id));
      setRegistration(res);
    } catch (e: any) {
      console.warn(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="event-back-btn">
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        {/* Hero image */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: params.image as string }} style={styles.heroImg} />
        </View>

        <Text style={[Typography.label, { color: C.brandPurple, fontSize: 11, marginTop: 12 }]}>
          {String(params.category).toUpperCase()} · {params.organizer}
        </Text>
        <Text style={[Typography.h2, { color: C.textPrimary, marginTop: 4 }]} testID="event-title">
          {params.title}
        </Text>

        {/* Meta info */}
        <Card style={{ marginTop: 16 }}>
          <View style={styles.metaRow}>
            <Calendar size={18} color={C.brandPurple} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>DATE</Text>
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{params.start_date}</Text>
            </View>
          </View>
          <View style={[styles.metaRow, { marginTop: 12 }]}>
            <MapPin size={18} color={C.brandPurple} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>VENUE</Text>
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{params.venue}</Text>
            </View>
          </View>
          <View style={[styles.metaRow, { marginTop: 12 }]}>
            <View style={[styles.deadlineDot]} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>REGISTER BY</Text>
              <Text style={[Typography.bodyBold, { color: C.warning }]}>
                {params.registration_deadline}
              </Text>
            </View>
          </View>
        </Card>

        {/* Tags */}
        {params.tags && (
          <View style={styles.tagsRow}>
            {String(params.tags).split(',').filter(Boolean).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={[Typography.label, { color: C.deepPurple, fontSize: 10 }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* QR Code (post-registration) */}
        {registration?.qr_code_base64 ? (
          <Card style={[styles.qrCard]} bg={C.deepPurple}>
            <View style={{ alignItems: 'center', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Check size={18} color={C.lightPurple} />
                <Text style={[Typography.label, { color: C.lightPurple }]}>YOU'RE REGISTERED</Text>
              </View>
              <Text style={[Typography.h4, { color: C.white }]}>Show this QR at entry</Text>
              <View style={styles.qrFrame}>
                <Image source={{ uri: `data:image/png;base64,${registration.qr_code_base64}` }}
                  style={styles.qr} testID="event-qr-image" />
              </View>
              <Text style={[Typography.bodySm, { color: C.lightPurple }]}>
                Reg ID: {registration.id}
              </Text>
            </View>
          </Card>
        ) : (
          <Button
            title={loading ? 'Registering...' : 'Register & Get QR'}
            loading={loading} onPress={register}
            style={{ marginTop: Spacing.lg }}
            testID="event-register-btn" />
        )}

        {/* External link */}
        {params.url && (
          <TouchableOpacity onPress={() => Linking.openURL(String(params.url))}
            style={styles.externalLink} testID="event-external-btn">
            <ExternalLink size={16} color={C.brandPurple} />
            <Text style={[Typography.bodyBold, { color: C.brandPurple }]}>Visit official page</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroWrap: { borderRadius: 16, overflow: 'hidden' },
  heroImg: { width: '100%', height: 200, backgroundColor: C.surfaceMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deadlineDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.warning },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { backgroundColor: C.palePurple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  qrCard: { marginTop: Spacing.lg, padding: 24 },
  qrFrame: { backgroundColor: C.white, padding: 8, borderRadius: 12, marginVertical: 4 },
  qr: { width: 180, height: 180 },
  externalLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', padding: 14, marginTop: 12,
  },
});
