import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users, Calendar, MapPin, Edit2, CheckCircle, Ticket, Activity } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Card, Button } from '@/src/views/components';
import { request } from '@/src/models/services/api';

export default function ManageEvent() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState('');

  useEffect(() => {
    if (params.id) {
      loadEvent();
    }
  }, [params.id]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      // Backend route GET /events/{id}
      const res = await request<any>(`/events/${params.id}`);
      setEvent(res);
      setTitle(res.title || '');
      setCapacity(res.capacity ? String(res.capacity) : '');
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        capacity: parseInt(capacity) || 100,
      };
      await request(`/events/${params.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setEditMode(false);
      loadEvent(); // reload
    } catch (e: any) {
      alert(e.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !event) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={[Typography.body, { color: C.textSecondary, margin: 20 }]}>Loading management portal...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: C.textPrimary }]}>Manage Event</Text>
        </View>

        {event ? (
          <View style={styles.content}>
            {/* Quick Stats Banner */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Users size={20} color={C.brandPurple} />
                <Text style={styles.statVal}>{event.attendee_count || 0}</Text>
                <Text style={styles.statLabel}>Registered</Text>
              </View>
              <View style={styles.statBox}>
                <Ticket size={20} color={C.brandPurple} />
                <Text style={styles.statVal}>{event.capacity || 'Unlimited'}</Text>
                <Text style={styles.statLabel}>Capacity</Text>
              </View>
              <View style={styles.statBox}>
                <Activity size={20} color={C.brandPurple} />
                <Text style={styles.statVal}>{event.spots_left !== undefined ? event.spots_left : '-'}</Text>
                <Text style={styles.statLabel}>Spots Left</Text>
              </View>
            </View>

            {/* Editing Section */}
            <Card style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <Text style={[Typography.h4, { color: C.textPrimary }]}>Event Details</Text>
                {!editMode && (
                  <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editBtn}>
                    <Edit2 size={14} color={C.brandPurple} />
                    <Text style={[Typography.label, { color: C.brandPurple, marginLeft: 4 }]}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editMode ? (
                <View style={{ gap: 12, marginTop: 16 }}>
                  <View>
                    <Text style={styles.inputLabel}>Event Title</Text>
                    <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Event Title"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>
                  <View>
                    <Text style={styles.inputLabel}>Capacity</Text>
                    <TextInput
                      style={styles.input}
                      value={capacity}
                      onChangeText={setCapacity}
                      placeholder="e.g. 200"
                      keyboardType="numeric"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <Button title="Cancel" variant="outline" onPress={() => setEditMode(false)} style={{ flex: 1 }} />
                    <Button title={saving ? "Saving..." : "Save Changes"} onPress={saveEdits} style={{ flex: 1 }} loading={saving} />
                  </View>
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 16 }}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Title</Text>
                    <Text style={styles.infoVal}>{event.title}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Type</Text>
                    <Text style={styles.infoVal}>{event.event_type}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Date</Text>
                    <Text style={styles.infoVal}>{event.event_date_start ? new Date(event.event_date_start).toLocaleString() : 'TBD'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Location</Text>
                    <Text style={styles.infoVal}>{event.location_city || 'Online'}</Text>
                  </View>
                </View>
              )}
            </Card>

            {/* Attendees Section */}
            <Card style={styles.attendeesCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={18} color={C.green} />
                <Text style={[Typography.h4, { color: C.textPrimary }]}>Attendee Management</Text>
              </View>
              <Text style={[Typography.body, { color: C.textSecondary }]}>
                {event.attendee_count || 0} students have registered. Detailed attendee list and QR scanning will be available here soon.
              </Text>
            </Card>
          </View>
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={[Typography.body, { color: C.textSecondary, textAlign: 'center' }]}>
              Event not found.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: C.surface },
  content: { gap: 16 },
  
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: C.surface, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderColor: C.border, borderWidth: 1 },
  statVal: { ...Typography.h3, color: C.textPrimary, marginTop: 8 },
  statLabel: { ...Typography.label, color: C.textSecondary, marginTop: 2 },
  
  editCard: { padding: 20 },
  editCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brandPurple + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: C.border, borderBottomWidth: 1 },
  infoKey: { ...Typography.body, color: C.textSecondary },
  infoVal: { ...Typography.bodyBold, color: C.textPrimary, flex: 1, textAlign: 'right', marginLeft: 16 },

  inputLabel: { ...Typography.label, color: C.textSecondary, marginBottom: 6 },
  input: { height: 44, backgroundColor: C.background, borderColor: C.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, color: C.textPrimary, ...Typography.body },

  attendeesCard: { padding: 20, marginTop: 8 },
});
