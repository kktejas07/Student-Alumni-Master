/**
 * Knowledge Rooms — chat-based discussion (Module 4: Networking)
 * Lists topical discussion rooms (Tech, Higher Ed, Startups, Careers, etc.).
 */
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.background }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 60 }}>
        <TouchableOpacity onPress={() => router.back()} className="items-center justify-center" style={{ width: 40, height: 40, marginBottom: 8 }} testID="rooms-back-btn">
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={[{ fontSize: 28, fontWeight: '800', color: C.textPrimary }]}>{'Knowledge Rooms'}</Text>
        <Text style={[Typography.body, { color: C.textSecondary, marginTop: 4 }]}>Join topical discussions with peers, alumni, and mentors.</Text>

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
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <View className="items-center justify-center" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.palePurple }}>
                    <Text style={{ fontSize: 26 }}>{r.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text style={[{ fontSize: 18, fontWeight: '700', color: C.textPrimary }]}>{r.name}</Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{r.description}</Text>
                    <View className="flex-row items-center" style={{ gap: 4, marginTop: 4 }}>
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
