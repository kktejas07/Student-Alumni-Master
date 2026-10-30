/**
 * Knowledge Rooms — chat-based discussion (Module 4: Networking)
 * Lists topical discussion rooms (Tech, Higher Ed, Startups, Careers, etc.).
 */
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, MessageCircle } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { AnimatedCard } from '@/src/views/components';
import { api } from '@/src/models/services/api';

export default function RoomsScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listRooms().then((r) => setRooms(r.rooms || [])).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="rooms-back-btn">
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.h1}>Knowledge Rooms</Text>
        <Text style={styles.subtitle}>Join topical discussions with peers, alumni, and mentors.</Text>

        {loading ? (
          <ActivityIndicator color={C.brandPurple} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: 12, marginTop: 12 }}>
            {rooms.map((r, idx) => (
              <AnimatedCard
                key={r.id}
                onPress={() =>
                  router.push({ pathname: '/room/[id]', params: { id: r.id, name: r.name } })
                }
                index={idx}
                testID={`room-${r.id}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.iconCircle}>
                    <Text style={{ fontSize: 26 }}>{r.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.h4, { color: C.textPrimary }]}>{r.name}</Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{r.description}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Users size={12} color={C.textMuted} />
                      <Text style={[Typography.bodySm, { color: C.textMuted }]}>
                        {r.members.toLocaleString()} members
                      </Text>
                    </View>
                  </View>
                  <MessageCircle size={20} color={C.brandPurple} />
                </View>
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  h1: { ...Typography.h2, color: C.textPrimary },
  subtitle: { ...Typography.body, color: C.textSecondary, marginTop: 4 },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.palePurple, alignItems: 'center', justifyContent: 'center',
  },
});
