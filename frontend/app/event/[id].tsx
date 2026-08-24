/**
 * Event Detail Screen with QR Registration
 * ==========================================
 * Spec: students register for events and get a QR code for venue check-in.
 * Backend (POST /events/:id/register) generates a unique QR per registration.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, Linking,
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
    <SafeAreaView className="flex-1 bg-bg2" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center mb-2" testID="event-back-btn">
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        {/* Hero image */}
        <View className="rounded-2xl overflow-hidden">
          <Image source={{ uri: params.image as string }} className="w-full h-50" style={{ backgroundColor: C.surfaceMuted }} />
        </View>

        <Text style={[Typography.label, { color: C.brandPurple, fontSize: 11, marginTop: 12 }]}>
          {String(params.category).toUpperCase()} · {params.organizer}
        </Text>
        <Text style={[Typography.h2, { color: C.textPrimary, marginTop: 4 }]} testID="event-title">
          {params.title}
        </Text>

        {/* Meta info */}
        <Card style={{ marginTop: 16 }}>
          <View className="flex-row items-center gap-3">
            <Calendar size={18} color={C.brandPurple} />
            <View className="flex-1">
              <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>DATE</Text>
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{params.start_date}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3 mt-3">
            <MapPin size={18} color={C.brandPurple} />
            <View className="flex-1">
              <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>VENUE</Text>
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{params.venue}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3 mt-3">
            <View className="w-[18px] h-[18px] rounded-full" style={{ backgroundColor: C.warning }} />
            <View className="flex-1">
              <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>REGISTER BY</Text>
              <Text style={[Typography.bodyBold, { color: C.warning }]}>
                {params.registration_deadline}
              </Text>
            </View>
          </View>
        </Card>

        {/* Tags */}
        {params.tags && (
          <View className="flex-row flex-wrap gap-1.5 mt-3">
            {String(params.tags).split(',').filter(Boolean).map((t) => (
              <View key={t} className="bg-violet/20 px-2.5 py-1 rounded-full">
                <Text style={[Typography.label, { color: C.deepPurple, fontSize: 10 }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* QR Code (post-registration) */}
        {registration?.qr_code_base64 ? (
          <Card style={[{ marginTop: Spacing.lg, padding: 24 }]} bg={C.deepPurple}>
            <View className="items-center gap-2.5">
              <View className="flex-row items-center gap-1.5">
                <Check size={18} color={C.lightPurple} />
                <Text style={[Typography.label, { color: C.lightPurple }]}>YOU'RE REGISTERED</Text>
              </View>
              <Text style={[Typography.h4, { color: C.white }]}>Show this QR at entry</Text>
              <View className="bg-white p-2 rounded-xl my-1">
                <Image source={{ uri: `data:image/png;base64,${registration.qr_code_base64}` }}
                  className="w-[180px] h-[180px]" testID="event-qr-image" />
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
            className="flex-row items-center gap-1.5 justify-center p-3.5 mt-3" testID="event-external-btn">
            <ExternalLink size={16} color={C.brandPurple} />
            <Text style={[Typography.bodyBold, { color: C.brandPurple }]}>Visit official page</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
