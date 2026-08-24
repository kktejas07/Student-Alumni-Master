import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      {/* NexusOS Deep Glass Background */}
      <LinearGradient
        pointerEvents="none"
        colors={['#0a0f1e', '#131938']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <AnimatedAurora intensity="normal" />
      <GridOverlay />

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, maxWidth: 1000, alignSelf: 'center', width: '100%' }}>
        <View className="flex-row items-center gap-4 mb-7">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <ArrowLeft size={20} color={PALETTE.text} />
          </TouchableOpacity>
          <Text className="text-white text-2xl" style={{ fontFamily: FONTS.xbold }}>Manage Event</Text>
        </View>

        {loading && !event ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator color={PALETTE.violet} />
            <Text className="text-muted font-body-semibold text-base mt-4">Loading event details...</Text>
          </View>
        ) : event ? (
          <View className="gap-4">
            {/* Quick Stats Banner */}
            <View className="flex-row gap-4 flex-wrap">
              <GlassCard radius={14} padding={16} className="flex-1 min-w-[140px] items-center py-5">
                <View className="w-10 h-10 rounded-xl items-center justify-center border mb-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                  <Users size={18} color={PALETTE.violet} />
                </View>
                <Text className="text-white text-2xl" style={{ fontFamily: FONTS.xbold }}>{event.attendee_count || 0}</Text>
                <Text className="text-muted font-body-semibold text-sm mt-1">Registered</Text>
              </GlassCard>

              <GlassCard radius={14} padding={16} className="flex-1 min-w-[140px] items-center py-5">
                <View className="w-10 h-10 rounded-xl items-center justify-center border mb-3" style={{ backgroundColor: 'rgba(34, 211, 238, 0.15)', borderColor: 'rgba(34, 211, 238, 0.3)' }}>
                  <Ticket size={18} color={PALETTE.teal} />
                </View>
                <Text className="text-white text-2xl" style={{ fontFamily: FONTS.xbold }}>{event.capacity || 'Unlimited'}</Text>
                <Text className="text-muted font-body-semibold text-sm mt-1">Capacity</Text>
              </GlassCard>

              <GlassCard radius={14} padding={16} className="flex-1 min-w-[140px] items-center py-5">
                <View className="w-10 h-10 rounded-xl items-center justify-center border mb-3" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                  <Activity size={18} color={PALETTE.rose} />
                </View>
                <Text className="text-white text-2xl" style={{ fontFamily: FONTS.xbold }}>{event.spots_left !== undefined ? event.spots_left : '-'}</Text>
                <Text className="text-muted font-body-semibold text-sm mt-1">Spots Left</Text>
              </GlassCard>
            </View>

            {/* Editing Section */}
            <GlassCard radius={16} padding={24}>
              <View className="flex-row justify-between items-center border-b border-white/5 pb-4">
                <Text className="text-white text-lg" style={{ fontFamily: FONTS.bold }}>Event Details</Text>
                <View className="flex-row gap-3">
                  {!editMode && (
                    <TouchableOpacity className="flex-row items-center bg-blue-500/15 px-3 py-1.5 rounded-lg border border-blue-500/30" onPress={() => setEditMode(true)}>
                      <Edit2 size={16} color={PALETTE.blue} />
                      <Text className="text-blue-500 font-body-bold text-sm ml-1.5">Edit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    className="flex-row items-center bg-rose/15 px-3 py-1.5 rounded-lg border border-rose/30" 
                    onPress={deleteEvent}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text className="text-rose font-body-bold text-sm ml-1.5">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {editMode ? (
                <View className="gap-4 mt-5">
                  <View>
                    <Text className="text-muted font-body-semibold text-sm mb-2 ml-1">Event Title</Text>
                    <GlassSoft className="rounded-xl h-12 justify-center">
                      <TextInput
                        className="flex-1 px-4 text-white font-body-semibold text-base"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Event Title"
                        placeholderTextColor={SC.dim}
                      />
                    </GlassSoft>
                  </View>
                  <View>
                    <Text className="text-muted font-body-semibold text-sm mb-2 ml-1">Capacity</Text>
                    <GlassSoft className="rounded-xl h-12 justify-center">
                      <TextInput
                        className="flex-1 px-4 text-white font-body-semibold text-base"
                        value={capacity}
                        onChangeText={setCapacity}
                        placeholder="e.g. 200"
                        keyboardType="numeric"
                        placeholderTextColor={SC.dim}
                      />
                    </GlassSoft>
                  </View>
                  <View className="flex-row gap-3 mt-4">
                    <TouchableOpacity className="flex-1 h-12 rounded-xl items-center justify-center border border-white/20" onPress={() => setEditMode(false)}>
                      <Text className="text-white font-body-bold text-base">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 h-12 rounded-xl items-center justify-center border border-violet bg-violet" onPress={saveEdits} disabled={saving}>
                      <Text className="text-white font-body-bold text-base">{saving ? "Saving..." : "Save Changes"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="gap-4 mt-5">
                  <View className="flex-row justify-between items-center py-3 border-b border-white/5">
                    <Text className="text-muted font-body-semibold text-base">Title</Text>
                    <Text className="text-white font-body-bold text-base flex-1 text-right ml-5">{event.title}</Text>
                  </View>
                  <View className="flex-row justify-between items-center py-3 border-b border-white/5">
                    <Text className="text-muted font-body-semibold text-base">Type</Text>
                    <Text className="text-white font-body-bold text-base flex-1 text-right ml-5">{event.event_type}</Text>
                  </View>
                  <View className="flex-row justify-between items-center py-3 border-b border-white/5">
                    <Text className="text-muted font-body-semibold text-base">Date</Text>
                    <Text className="text-white font-body-bold text-base flex-1 text-right ml-5">{event.event_date_start ? new Date(event.event_date_start).toLocaleString() : 'TBD'}</Text>
                  </View>
                  <View className="flex-row justify-between items-center py-3 border-b border-white/5">
                    <Text className="text-muted font-body-semibold text-base">Location</Text>
                    <Text className="text-white font-body-bold text-base flex-1 text-right ml-5">{event.location_city || 'Online'}</Text>
                  </View>
                </View>
              )}
            </GlassCard>

            {/* Attendees Section */}
            <GlassCard radius={16} padding={24} className="mt-2">
              <View className="flex-row items-center gap-2.5 mb-4">
                <View className="w-10 h-10 rounded-xl items-center justify-center border mb-3" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <CheckCircle size={16} color={PALETTE.teal} />
                </View>
                <Text className="text-white text-lg" style={{ fontFamily: FONTS.bold }}>Attendee Management</Text>
              </View>
              <Text className="text-muted font-body-semibold text-base" style={{ lineHeight: 22 }}>
                {event.attendee_count || 0} students have registered. Detailed attendee list and QR scanning will be available here soon.
              </Text>
            </GlassCard>
          </View>
        ) : (
          <View className="py-16 items-center justify-center">
            <Text className="text-muted font-body-bold text-base">Event not found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
