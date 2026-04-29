/**
 * Admin Mentor Approval Queue
 * ============================
 * Admin-only screen to review pending mentor applications.
 * Each pending mentor shows:
 *  - Name, organization, job title, LinkedIn
 *  - Mentor category they applied under
 *  - Approve / Reject buttons
 *
 * After action, the list refreshes so approved/rejected items disappear.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Linkedin, Check, X, Briefcase, Building2 } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Card, Button } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { useAuth } from '@/src/viewmodels/hooks';

const CATEGORY_LABELS: Record<string, string> = {
  it_software: 'IT / Software',
  higher_education: 'Higher Education',
  startup_business: 'Startup / Business',
  education: 'Education / Faculty',
};

export default function AdminMentorsQueue() {
  const router = useRouter();
  const { user } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  // Block non-admins from viewing this screen at all.
  useEffect(() => {
    if (user && user.role !== 'admin') {
      Alert.alert('Access denied', 'Only platform admins can review mentors.');
      router.back();
    }
  }, [user, router]);

  /** Fetches pending mentor applications. */
  const load = async () => {
    setLoading(true);
    try {
      const res = await api.pendingMentors();
      setPending(res.mentors || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /** Approve a pending mentor — they become visible to students. */
  const approve = async (id: string) => {
    setActingOn(id);
    try {
      await api.approveMentor(id);
      setPending((p) => p.filter((m) => m.id !== id));
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setActingOn(null);
    }
  };

  /** Reject a pending mentor — they cannot mentor students. */
  const reject = async (id: string) => {
    setActingOn(id);
    try {
      await api.rejectMentor(id);
      setPending((p) => p.filter((m) => m.id !== id));
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setActingOn(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} testID="admin-back-btn" style={styles.back}>
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.h1}>Mentor Queue</Text>
        <Text style={styles.subtitle}>Review and approve mentor applications.</Text>

        {loading ? (
          <ActivityIndicator color={C.brandPurple} style={{ marginTop: 60 }} />
        ) : pending.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
            <Text style={[Typography.h3, { color: C.textPrimary, marginBottom: 8 }]}>All caught up!</Text>
            <Text style={[Typography.body, { color: C.textSecondary, textAlign: 'center' }]}>
              No mentor applications waiting for review.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 12, marginTop: 12 }}>
            {pending.map((m: any) => {
              const info = m.mentor_info || {};
              const categoryLabel = CATEGORY_LABELS[info.category] || info.category;
              return (
                <Card key={m.id} testID={`pending-mentor-${m.id}`}>
                  <Text style={[Typography.h4, { color: C.textPrimary }]}>{m.full_name}</Text>
                  <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{m.email}</Text>

                  <View style={styles.categoryPill}>
                    <Text style={[Typography.label, { color: C.deepPurple, fontSize: 10 }]}>
                      {categoryLabel}
                    </Text>
                  </View>

                  <View style={{ marginTop: 12, gap: 8 }}>
                    <View style={styles.infoRow}>
                      <Building2 size={14} color={C.textMuted} />
                      <Text style={[Typography.body, { color: C.textPrimary }]}>
                        {info.organization || 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Briefcase size={14} color={C.textMuted} />
                      <Text style={[Typography.body, { color: C.textPrimary }]}>
                        {info.job_title || 'Not provided'}
                      </Text>
                    </View>
                    {info.linkedin_url && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(info.linkedin_url)}
                        style={styles.infoRow}
                      >
                        <Linkedin size={14} color={C.info} />
                        <Text style={[Typography.bodyBold, { color: C.info }]}>
                          {info.linkedin_url}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {info.years_of_experience && (
                      <Text style={[Typography.bodySm, { color: C.textSecondary }]}>
                        {info.years_of_experience} years of experience
                      </Text>
                    )}
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => reject(m.id)}
                      disabled={actingOn === m.id}
                      style={[styles.actionBtn, styles.rejectBtn]}
                      testID={`reject-${m.id}`}
                      activeOpacity={0.7}
                    >
                      <X size={16} color={C.danger} />
                      <Text style={[Typography.bodyBold, { color: C.danger, fontSize: 14 }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => approve(m.id)}
                      disabled={actingOn === m.id}
                      style={[styles.actionBtn, styles.approveBtn]}
                      testID={`approve-${m.id}`}
                      activeOpacity={0.7}
                    >
                      <Check size={16} color={C.white} />
                      <Text style={[Typography.bodyBold, { color: C.white, fontSize: 14 }]}>
                        {actingOn === m.id ? 'Approving…' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
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
  subtitle: { ...Typography.body, color: C.textSecondary, marginTop: 4, marginBottom: 8 },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: C.palePurple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveBtn: { backgroundColor: C.success },
  rejectBtn: {
    backgroundColor: C.dangerSoft,
    borderWidth: 1.5,
    borderColor: C.danger,
  },
});
