import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Users, Calendar, MapPin, Edit2, CheckCircle, Ticket, Activity, Trash2 } from 'lucide-react-native';

import { AnimatedAurora, GridOverlay, GlassCard, GlassSoft } from '@/src/views/web/portals/student/glass';
import { PALETTE, FONTS, SC } from '@/src/views/web/portals/student/tokens';
import { request } from '@/src/models/services/api';
import { useToast, useConfirm } from '@/src/views/components';

export default function ManageEvent() {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
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
      await request(`/events/${params.id}`, { method: 'PATCH', body: payload });
      setEditMode(false);
      toast.success('Event Updated', 'Changes have been saved successfully.');
      loadEvent(); 
    } catch (e: any) {
      toast.error('Update Failed', e.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    const ok = await confirm({
      title: 'Delete event',
      message: 'Are you sure you want to delete this event? This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await request(`/events/${params.id}`, { method: 'DELETE' });
      toast.success('Event Deleted', 'The event has been permanently removed.');
      router.back();
    } catch (e: any) {
      toast.error('Failed to Delete', e.message || 'Could not delete event');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* NexusOS Deep Glass Background */}
      <LinearGradient
        pointerEvents="none"
        colors={['#0a0f1e', '#131938']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <AnimatedAurora intensity="normal" />
      <GridOverlay />

      <ScrollView contentContainerStyle={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <ArrowLeft size={20} color={PALETTE.text} />
          </TouchableOpacity>
          <Text style={s.pageTitle}>Manage Event</Text>
        </View>

        {loading && !event ? (
          <View style={s.centerBox}>
            <ActivityIndicator color={PALETTE.violet} />
            <Text style={s.loadingText}>Loading event details...</Text>
          </View>
        ) : event ? (
          <View style={s.content}>
            {/* Quick Stats Banner */}
            <View style={s.statsRow}>
              <GlassCard radius={14} padding={16} style={s.statBox}>
                <View style={[s.iconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
                  <Users size={18} color={PALETTE.violet} />
                </View>
                <Text style={s.statVal}>{event.attendee_count || 0}</Text>
                <Text style={s.statLabel}>Registered</Text>
              </GlassCard>

              <GlassCard radius={14} padding={16} style={s.statBox}>
                <View style={[s.iconWrap, { backgroundColor: 'rgba(34, 211, 238, 0.15)', borderColor: 'rgba(34, 211, 238, 0.3)' }]}>
                  <Ticket size={18} color={PALETTE.teal} />
                </View>
                <Text style={s.statVal}>{event.capacity || 'Unlimited'}</Text>
                <Text style={s.statLabel}>Capacity</Text>
              </GlassCard>

              <GlassCard radius={14} padding={16} style={s.statBox}>
                <View style={[s.iconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.3)' }]}>
                  <Activity size={18} color={PALETTE.rose} />
                </View>
                <Text style={s.statVal}>{event.spots_left !== undefined ? event.spots_left : '-'}</Text>
                <Text style={s.statLabel}>Spots Left</Text>
              </GlassCard>
            </View>

            {/* Editing Section */}
            <GlassCard radius={16} padding={24}>
              <View style={s.editCardHeader}>
                <Text style={s.sectionTitle}>Event Details</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {!editMode && (
                    <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(true)}>
                      <Edit2 size={16} color={PALETTE.blue} />
                      <Text style={s.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[s.editBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]} 
                    onPress={deleteEvent}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={[s.editBtnText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {editMode ? (
                <View style={{ gap: 16, marginTop: 20 }}>
                  <View>
                    <Text style={s.inputLabel}>Event Title</Text>
                    <GlassSoft style={s.inputBox}>
                      <TextInput
                        style={s.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Event Title"
                        placeholderTextColor={SC.dim}
                      />
                    </GlassSoft>
                  </View>
                  <View>
                    <Text style={s.inputLabel}>Capacity</Text>
                    <GlassSoft style={s.inputBox}>
                      <TextInput
                        style={s.input}
                        value={capacity}
                        onChangeText={setCapacity}
                        placeholder="e.g. 200"
                        keyboardType="numeric"
                        placeholderTextColor={SC.dim}
                      />
                    </GlassSoft>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                    <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => setEditMode(false)}>
                      <Text style={s.btnOutlineText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.btnSolid]} onPress={saveEdits} disabled={saving}>
                      <Text style={s.btnSolidText}>{saving ? "Saving..." : "Save Changes"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 16, marginTop: 20 }}>
                  <View style={s.infoRow}>
                    <Text style={s.infoKey}>Title</Text>
                    <Text style={s.infoVal}>{event.title}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoKey}>Type</Text>
                    <Text style={s.infoVal}>{event.event_type}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoKey}>Date</Text>
                    <Text style={s.infoVal}>{event.event_date_start ? new Date(event.event_date_start).toLocaleString() : 'TBD'}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoKey}>Location</Text>
                    <Text style={s.infoVal}>{event.location_city || 'Online'}</Text>
                  </View>
                </View>
              )}
            </GlassCard>

            {/* Attendees Section */}
            <GlassCard radius={16} padding={24} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <View style={[s.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <CheckCircle size={16} color={PALETTE.teal} />
                </View>
                <Text style={s.sectionTitle}>Attendee Management</Text>
              </View>
              <Text style={s.attendeeDesc}>
                {event.attendee_count || 0} students have registered. Detailed attendee list and QR scanning will be available here soon.
              </Text>
            </GlassCard>
          </View>
        ) : (
          <View style={s.centerBox}>
            <Text style={s.notFoundText}>Event not found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },
  container: { padding: 24, paddingBottom: 60, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pageTitle: { color: PALETTE.text, fontFamily: FONTS.xbold, fontSize: 24 },
  
  content: { gap: 16 },
  
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  statBox: { flex: 1, minWidth: 140, alignItems: 'center', paddingVertical: 20 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 12 },
  statVal: { color: PALETTE.text, fontFamily: FONTS.xbold, fontSize: 26 },
  statLabel: { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 4 },
  
  editCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 },
  sectionTitle: { color: PALETTE.text, fontFamily: FONTS.bold, fontSize: 18 },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  editBtnText: { color: PALETTE.blue, fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1 },
  infoKey: { color: SC.muted, fontFamily: FONTS.med, fontSize: 14 },
  infoVal: { color: PALETTE.text, fontFamily: FONTS.bold, fontSize: 15, flex: 1, textAlign: 'right', marginLeft: 20 },

  inputLabel: { color: SC.muted, fontFamily: FONTS.semi, fontSize: 13, marginBottom: 8, marginLeft: 4 },
  inputBox: { borderRadius: 12, height: 48, justifyContent: 'center' },
  input: { flex: 1, paddingHorizontal: 16, color: PALETTE.text, fontFamily: FONTS.med, fontSize: 15 },

  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnOutline: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' },
  btnOutlineText: { color: PALETTE.text, fontFamily: FONTS.bold, fontSize: 15 },
  btnSolid: { backgroundColor: PALETTE.violet, borderColor: PALETTE.violet },
  btnSolidText: { color: PALETTE.text, fontFamily: FONTS.bold, fontSize: 15 },

  attendeeDesc: { color: SC.muted, fontFamily: FONTS.med, fontSize: 14, lineHeight: 22 },

  centerBox: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 15, marginTop: 16 },
  notFoundText: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 16 },
});
