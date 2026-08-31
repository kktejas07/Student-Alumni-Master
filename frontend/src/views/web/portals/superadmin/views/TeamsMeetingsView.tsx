/**
 * TeamsMeetingsView — Microsoft Teams integration panel.
 *
 * Lets super-admins create Teams meetings with:
 * - Seat limits / capacity control
 * - Registration form for non-logged-in users (email, phone, full name)
 * - Attendance tracking via Microsoft Graph API
 * - Public registration endpoint (no auth required)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, Calendar, Users, CheckCircle, Copy, Share2, Trash2, Clock, Plus, Save, ChevronDown, Pencil } from 'lucide-react-native';
import { SAC, useSAC, FONTS } from '../tokens';
import { request } from '@/src/models/services/api';

type Meeting = {
  _id: string;
  meeting_id: string;
  subject: string;
  join_url: string;
  start_time: string;
  duration_minutes: number;
  seat_limit: number | null;
  attendees: string[];
  attendee_emails?: string[];
  description?: string;
  registrations: Array<{
    reg_id: string;
    full_name: string;
    email: string;
    phone?: string;
    registered_at: string;
    status: string;
  }>;
  is_mock: boolean;
  created_at: string;
  event_slug?: string;
  organizer_email?: string;
};

export function TeamsMeetingsView() {
  const T = useSAC();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', date: '', time: '', duration: 60, seat_limit: '', description: '', attendee_emails: '', event_slug: '', organizer_email: '',
  });
  const [regOpen, setRegOpen] = useState<Meeting | null>(null);
  const [events, setEvents] = useState<Array<{ slug: string; title: string }>>([]);
  const [eventOpen, setEventOpen] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<any>('/integrations/teams/meetings');
      setMeetings(res?.meetings || []);
    } catch (e) {
      // Not authed or error — show empty state
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await request<any>('/echo/showcases', { auth: false });
      const list = Array.isArray(res) ? res : res?.showcases || res?.items || [];
      const mapped = (list as any[])
        .map((e: any) => ({ slug: e.slug || e.id, title: e.title || e.slug || 'Untitled' }))
        .filter((e: any) => e.slug);
      setEvents(mapped);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ─── Generate date/time options for dropdowns ─────────────────────────
  const today = new Date();
  const dateOptions = [];
  for (let i = 0; i < 31; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    dateOptions.push({ value: dateStr, label });
  }

  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      timeOptions.push({ value: timeStr, label });
    }
  }

  const durationOptions = [30, 45, 60, 90, 120, 180];

  // ─── Create Meeting ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: '',
    date: dateOptions[0]?.value || '',
    time: timeOptions.find(t => t.label.includes('9:00 AM'))?.value || timeOptions[8]?.value || '09:00',
    duration: 60,
    seat_limit: '',
    description: '',
    attendee_emails: '',
    event_slug: '',
    organizer_email: '',
  });

  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);

  const activeForm = editingMeeting ? editForm : form;
  const setActiveForm = editingMeeting ? setEditForm : setForm;

  const handleCreate = async () => {
    const activeForm = editingMeeting ? editForm : form;
    if (!activeForm.title || !activeForm.date || !activeForm.time) {
      alert('Please fill in title, date, and time.');
      return;
    }
    setCreating(true);
    try {
      const start_time = `${activeForm.date}T${activeForm.time}`;
      const payload = {
        title: activeForm.title,
        start_time,
        duration_minutes: Number(activeForm.duration) || 60,
        attendee_emails: activeForm.attendee_emails ? activeForm.attendee_emails.split(',').map(e => e.trim()).filter(Boolean) : [],
        seat_limit: activeForm.seat_limit ? Number(activeForm.seat_limit) : null,
        description: activeForm.description,
        event_slug: activeForm.event_slug || null,
        organizer_email: activeForm.organizer_email || null,
      };

      let res;
      if (editingMeeting) {
        // Edit existing meeting
        res = await request<any>(`/integrations/teams/meetings/${editingMeeting.meeting_id}`, {
          method: 'PATCH', body: payload,
        });
        setMeetings(meetings.map(m => m.meeting_id === editingMeeting.meeting_id ? res : m));
        setEditingMeeting(null);
      } else {
        // Create new meeting
        res = await request<any>('/integrations/teams/meetings', {
          method: 'POST', body: payload,
        });
        if (res?.meeting_id) {
          setMeetings([res, ...meetings]);
        } else {
          alert('Failed to create meeting.');
          setCreating(false);
          return;
        }
      }
      setShowCreate(false);
      setEditingMeeting(null);
      setForm({ title: '', date: dateOptions[0]?.value || '', time: timeOptions[8]?.value || '09:00', duration: 60, seat_limit: '', description: '', attendee_emails: '', event_slug: '', organizer_email: '' });
    } catch (e: any) {
      alert(e?.message || 'Failed to save meeting.');
    } finally {
      setCreating(false);
    }
  };

  // ─── Registration form for non-logged-in users ───────────────────────
  const [regForm, setRegForm] = useState({ full_name: '', email: '', phone: '' });

  const handleRegister = async () => {
    if (!regOpen) return;
    if (!regForm.full_name || !regForm.email) {
      alert('Name and email are required.');
      return;
    }
    try {
      const res = await request<any>(`/integrations/teams/meetings/${regOpen.meeting_id}/register`, {
        method: 'POST', body: {
          full_name: regForm.full_name,
          email: regForm.email,
          phone: regForm.phone,
        }, auth: false,
      });
      if (res?.success) {
        if (res.join_url && typeof window !== 'undefined') {
          window.open(res.join_url, '_blank');
        }
        alert('Registered! Check your email for meeting details.');
        setRegOpen(null);
        setRegForm({ full_name: '', email: '', phone: '' });
        fetchMeetings();
      } else {
        alert(res?.error || 'Registration failed.');
      }
    } catch (e: any) {
      alert(e?.message || 'Registration failed.');
    }
  };

  // ─── Copy join URL ───────────────────────────────────────────────────
  const copyUrl = (url: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(url);
      alert('Join URL copied!');
    }
  };

  // ─── Delete meeting ──────────────────────────────────────────────────
  const deleteMeeting = async (id: string) => {
    if (!confirm('Delete this meeting? This cannot be undone.')) return;
    try {
      await request<any>(`/integrations/teams/meetings/${id}`, { method: 'DELETE' });
      setMeetings(meetings.filter(m => m.meeting_id !== id));
    } catch {
      alert('Failed to delete.');
    }
  };

  const toISTDate = (iso: string) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
      const p = (t: string) => parts.find(x => x.type === t)?.value || '';
      return `${p('year')}-${p('month')}-${p('day')}`;
    } catch { return ''; }
  };

  const toISTTime = (iso: string) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso));
      const p = (t: string) => parts.find(x => x.type === t)?.value || '';
      return `${p('hour')}:${p('minute')}`;
    } catch { return ''; }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  };

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator size="large" color={SAC.violet} />
        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 12 }}>Loading Teams meetings…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <Video size={24} color={SAC.violetLt} />
          <Text style={s.h1}>Microsoft Teams Meetings</Text>
        </View>
        <Text style={s.hSub}>Create, manage, and track attendance for Teams meetings with seat-limited registration.</Text>
      </View>

      {/* Create Button */}
      <Pressable onPress={() => setShowCreate(true)} style={s.createBtn}>
        <Plus size={16} color="#fff" />
        <Text style={s.createBtnText}>Create New Meeting</Text>
      </Pressable>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <View style={s.empty}>
          <Calendar size={48} color={SAC.muted} />
          <Text style={s.emptyTitle}>No meetings yet</Text>
          <Text style={s.emptySub}>Create your first Teams meeting to get started.</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {meetings.map((m) => (
            <View key={m.meeting_id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{m.subject}</Text>
                <View style={[s.statusBadge, { backgroundColor: m.is_mock ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)' }]}>
                  <View style={[s.dot, { backgroundColor: m.is_mock ? '#F59E0B' : '#10B981' }]} />
                  <Text style={[s.statusText, { color: m.is_mock ? '#FCD34D' : '#34D399' }]}>
                    {m.is_mock ? 'Mock' : 'Active'}
                  </Text>
                </View>
              </View>

              <View style={s.cardMeta}>
                <View style={s.metaRow}>
                  <Clock size={12} color={SAC.muted} />
                  <Text style={s.metaText}>{formatDate(m.start_time)} · {m.duration_minutes} min</Text>
                </View>
                {m.seat_limit && (
                  <View style={s.metaRow}>
                    <Users size={12} color={SAC.muted} />
                    <Text style={s.metaText}>{m.registrations?.length || 0}/{m.seat_limit} seats filled</Text>
                  </View>
                )}
                {m.attendees?.length > 0 && (
                  <View style={s.metaRow}>
                    <Users size={12} color={SAC.muted} />
                    <Text style={s.metaText}>{m.attendees.length} required attendees</Text>
                  </View>
                )}
              </View>

              {m.join_url && (
                <Pressable onPress={() => copyUrl(m.join_url)} style={s.urlRow}>
                  <Text style={s.urlText} numberOfLines={1}>{m.join_url}</Text>
                  <Copy size={12} color={SAC.muted} />
                </Pressable>
              )}

<View style={s.cardActions}>
                <Pressable onPress={() => setRegOpen(m)} style={s.actionBtn}>
                  <Users size={12} color="#C4B5FD" />
                  <Text style={s.actionBtnText}>Registration form</Text>
                </Pressable>
                <Pressable onPress={() => {
                  setEditForm({
                    title: m.subject,
                    date: m.start_time ? (toISTDate(m.start_time) || form.date) : form.date,
                    time: m.start_time ? (toISTTime(m.start_time) || form.time) : form.time,
                    duration: m.duration_minutes || 60,
                    seat_limit: m.seat_limit ? String(m.seat_limit) : '',
                    description: m.description || '',
                    attendee_emails: (m.attendee_emails || []).join(', '),
                    event_slug: m.event_slug || '',
                    organizer_email: m.organizer_email || '',
                  });
                  setEditingMeeting(m);
                  setShowCreate(true);
                }} style={s.actionBtn}>
                  <Pencil size={12} color="#C4B5FD" />
                  <Text style={s.actionBtnText}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => {
                  if (typeof window !== 'undefined') {
                    const regUrl = `${window.location.origin}/teams/register/${m.meeting_id}`;
                    navigator.clipboard.writeText(regUrl);
                    alert('Registration link copied!');
                  }
                }} style={s.actionBtn}>
                  <Share2 size={12} color="#C4B5FD" />
                  <Text style={s.actionBtnText}>Invite</Text>
                </Pressable>
                <Pressable onPress={() => deleteMeeting(m.meeting_id)} style={[s.actionBtn, { borderColor: 'rgba(248,113,134,0.3)' }]}>
                  <Trash2 size={12} color="#F87171" />
                  <Text style={[s.actionBtnText, { color: '#F87171' }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Create/Edit Meeting Modal */}
      {showCreate && (
        <Modal transparent visible={showCreate} animationType="fade" onRequestClose={() => { setShowCreate(false); setEditingMeeting(null); }}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>{editingMeeting ? 'Edit Teams Meeting' : 'Create Teams Meeting'}</Text>

              <Text style={s.inputLabel}>Title</Text>
              <TextInput placeholder="e.g. Career Workshop: Startups 101" placeholderTextColor={SAC.muted}
                style={s.input} value={editingMeeting ? editForm.title : form.title} onChangeText={(t) => {
                  if (editingMeeting) setEditForm({ ...editForm, title: t }); else setForm({ ...form, title: t });
                }} />

               <Text style={s.inputLabel}>Link to Event (optional)</Text>
               <Pressable onPress={() => setEventOpen(true)} style={s.dropdown}>
                 <Text style={s.dropdownText} numberOfLines={1}>
                   {events.find(e => e.slug === activeForm.event_slug)?.title || (activeForm.event_slug ? activeForm.event_slug : 'Select an event…')}
                 </Text>
                 <ChevronDown size={14} color={SAC.muted} />
               </Pressable>
               {eventOpen && (
                 <Modal transparent visible={eventOpen} animationType="fade" onRequestClose={() => setEventOpen(false)}>
                   <View style={s.modalOverlay}>
                     <View style={[s.modalContent, { maxHeight: 360, padding: 16 }]}>
                       <Text style={s.modalTitle}>Select Event</Text>
                       <ScrollView>
                         <Pressable
                           onPress={() => { setActiveForm({ ...activeForm, event_slug: '' }); setEventOpen(false); }}
                           style={[s.dropdownOption, !activeForm.event_slug && s.dropdownOptionSelected]}
                         >
                           <Text style={[s.dropdownOptionText, !activeForm.event_slug && s.dropdownOptionTextSelected]}>None</Text>
                         </Pressable>
                         {events.map((ev) => (
                           <Pressable
                             key={ev.slug}
                             onPress={() => { setActiveForm({ ...activeForm, event_slug: ev.slug }); setEventOpen(false); }}
                             style={[s.dropdownOption, activeForm.event_slug === ev.slug && s.dropdownOptionSelected]}
                           >
                             <Text style={[s.dropdownOptionText, activeForm.event_slug === ev.slug && s.dropdownOptionTextSelected]} numberOfLines={1}>{ev.title}</Text>
                           </Pressable>
                         ))}
                         {events.length === 0 && (
                           <Text style={s.dropdownText}>No events available</Text>
                         )}
                       </ScrollView>
                     </View>
                   </View>
                 </Modal>
               )}

               <Text style={s.inputLabel}>Date</Text>
               {Platform.OS === 'web' ? (
                 <input
                   type="date"
                   value={activeForm.date || ''}
                   onChange={(e: any) => setActiveForm({ ...activeForm, date: e.target.value })}
                   style={{
                     width: '100%', backgroundColor: '#101019', border: `1px solid ${SAC.border}`,
                     borderRadius: 8, padding: '9px 12px', fontFamily: FONTS.med, fontSize: 13,
                     color: SAC.text, colorScheme: 'dark',
                   }}
                 />
               ) : (
                 <Pressable onPress={() => setDateOpen(true)} style={s.dropdown}>
                   <Text style={s.dropdownText}>
                     {dateOptions.find(d => d.value === activeForm.date)?.label || 'Select date'}
                   </Text>
                   <ChevronDown size={14} color={SAC.muted} />
                 </Pressable>
               )}

               <Text style={s.inputLabel}>Time (IST)</Text>
               {Platform.OS === 'web' ? (
                 <input
                   type="time"
                   value={activeForm.time || ''}
                   onChange={(e: any) => setActiveForm({ ...activeForm, time: e.target.value })}
                   style={{
                     width: '100%', backgroundColor: '#101019', border: `1px solid ${SAC.border}`,
                     borderRadius: 8, padding: '9px 12px', fontFamily: FONTS.med, fontSize: 13,
                     color: SAC.text, colorScheme: 'dark',
                   }}
                 />
               ) : (
                 <Pressable onPress={() => setTimeOpen(true)} style={s.dropdown}>
                   <Text style={s.dropdownText}>
                     {timeOptions.find(t => t.value === activeForm.time)?.label || 'Select time'}
                   </Text>
                   <ChevronDown size={14} color={SAC.muted} />
                 </Pressable>
               )}

              <Text style={s.inputLabel}>Duration</Text>
              <Pressable onPress={() => setDurationOpen(true)} style={s.dropdown}>
                <Text style={s.dropdownText}>{durationOptions.find(d => d === activeForm.duration)?.toString() || '60'} minutes</Text>
                <ChevronDown size={14} color={SAC.muted} />
              </Pressable>
              {durationOpen && (
                <Modal transparent visible={durationOpen} animationType="fade" onRequestClose={() => setDurationOpen(false)}>
                  <View style={s.modalOverlay}>
                    <View style={[s.modalContent, { maxHeight: 300, padding: 16 }]}>
                      <Text style={s.modalTitle}>Select Duration</Text>
                      {durationOptions.map((d) => (
                        <Pressable
                          key={d}
                          onPress={() => { setActiveForm({ ...activeForm, duration: d }); setDurationOpen(false); }}
                          style={[s.dropdownOption, activeForm.duration === d && s.dropdownOptionSelected]}
                        >
                          <Text style={[s.dropdownOptionText, activeForm.duration === d && s.dropdownOptionTextSelected]}>{d} minutes</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </Modal>
              )}

              <Text style={s.inputLabel}>Seat Limit (leave blank for unlimited)</Text>
              <TextInput placeholder="e.g. 50" placeholderTextColor={SAC.muted}
                style={s.input} value={editingMeeting ? editForm.seat_limit : form.seat_limit} onChangeText={(t) => {
                  if (editingMeeting) setEditForm({ ...editForm, seat_limit: t }); else setForm({ ...form, seat_limit: t });
                }} keyboardType="numeric" />

              <Text style={s.inputLabel}>Attendee Emails (comma-separated)</Text>
              <TextInput placeholder="attendee1@college.edu, attendee2@college.edu" placeholderTextColor={SAC.muted}
                style={s.input} value={editingMeeting ? editForm.attendee_emails : form.attendee_emails} onChangeText={(t) => {
                  if (editingMeeting) setEditForm({ ...editForm, attendee_emails: t }); else setForm({ ...form, attendee_emails: t });
                }} />

              <Text style={s.inputLabel}>Organizer Email (required for real Teams meetings)</Text>
              <TextInput placeholder="organizer@college.edu" placeholderTextColor={SAC.muted} autoCapitalize="none"
                style={s.input} value={editingMeeting ? editForm.organizer_email : form.organizer_email} onChangeText={(t) => {
                  if (editingMeeting) setEditForm({ ...editForm, organizer_email: t }); else setForm({ ...form, organizer_email: t });
                }} />

              <Text style={s.inputLabel}>Description (optional)</Text>
              <TextInput placeholder="Meeting description or agenda" placeholderTextColor={SAC.muted}
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                value={editingMeeting ? editForm.description : form.description} onChangeText={(t) => {
                  if (editingMeeting) setEditForm({ ...editForm, description: t }); else setForm({ ...form, description: t });
                }} multiline />

              <View style={s.modalActions}>
                <Pressable onPress={() => { setShowCreate(false); setEditingMeeting(null); }} style={s.modalCancelBtn}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleCreate} disabled={creating} style={[s.modalSaveBtn, creating && { opacity: 0.6 }]}>
                  {creating ? <ActivityIndicator size="small" color="#fff" /> : <Save size={14} color="#fff" />}
                  <Text style={s.modalSaveText}>{creating ? 'Creating...' : 'Create Meeting'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Registration Form Modal */}
      {regOpen && (
        <Modal transparent visible={!!regOpen} animationType="fade" onRequestClose={() => setRegOpen(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Registration Form — {regOpen.subject}</Text>
              <Text style={s.modalSub}>Share this form with attendees to collect their details before the meeting.</Text>

              <View style={s.regStats}>
                <View style={s.statItem}>
                  <Users size={16} color="#8B5CF6" />
                  <Text style={s.statText}>{regOpen.registrations?.length || 0} registered</Text>
                </View>
                {regOpen.seat_limit && (
                  <View style={s.statItem}>
                    <CheckCircle size={16} color={regOpen.seat_limit > (regOpen.registrations?.length || 0) ? '#10B981' : '#F87171'} />
                    <Text style={s.statText}>{regOpen.seat_limit - (regOpen.registrations?.length || 0)} spots left</Text>
                  </View>
                )}
              </View>

              {regOpen.registrations?.length > 0 && (
                <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
                  {regOpen.registrations.map((r) => (
                    <View key={r.reg_id} style={s.regRow}>
                      <View>
                        <Text style={s.regName}>{r.full_name}</Text>
                        <Text style={s.regEmail}>{r.email}{r.phone && ` · ${r.phone}`}</Text>
                      </View>
                      <Text style={s.regDate}>{new Date(r.registered_at).toLocaleDateString()}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Invite via Email */}
              <View style={s.inviteSection}>
                <Text style={s.inviteLabel}>Registration link</Text>
                <View style={s.inviteUrlRow}>
                  <Text style={s.inviteUrl} numberOfLines={1}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/teams/register/${regOpen.meeting_id}` : `/teams/register/${regOpen.meeting_id}`}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const url = `${window.location.origin}/teams/register/${regOpen.meeting_id}`;
                      navigator.clipboard.writeText(url);
                      alert('Registration link copied!');
                    }}
                    style={s.inviteCopyBtn}
                  >
                    <Copy size={12} color="#fff" />
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/teams/register/${regOpen.meeting_id}`;
                    const subject = encodeURIComponent(`Invitation: ${regOpen.subject}`);
                    const body = encodeURIComponent(`You're invited to: ${regOpen.subject}\n\nPlease register here: ${url}\n\nDuration: ${regOpen.duration_minutes} minutes`);
                    if (typeof window !== 'undefined') {
                      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                    }
                  }}
                  style={s.inviteEmailBtn}
                >
                  <Share2 size={14} color="#fff" />
                  <Text style={s.inviteEmailBtnText}>Invite via Email</Text>
                </Pressable>
              </View>

              <Pressable onPress={() => {
                setRegOpen(null);
                fetchMeetings();
              }} style={s.modalCancelBtn}>
                <Text style={s.modalCancelText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 20 },
  header: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  h1: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.3 },
  hSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, lineHeight: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SAC.violet, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18,
    marginBottom: 20, alignSelf: 'flex-start',
  },
  createBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  grid: { gap: 16 },
  card: {
    backgroundColor: SAC.panel, borderRadius: 16, borderWidth: 1, borderColor: SAC.line,
    padding: 18, gap: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 16, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.5 },
  cardMeta: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  urlRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  urlText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.line,
  },
  actionBtnText: { color: SAC.violetLt, fontFamily: FONTS.bold, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 16 },
  emptySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: SAC.panel, borderRadius: 18, padding: 24, width: '90%', maxWidth: 520, borderWidth: 1, borderColor: SAC.line },
  modalTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18, marginBottom: 4 },
  modalSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginBottom: 18 },
  inputLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.line,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: SAC.text,
    fontFamily: FONTS.med, fontSize: 14, marginBottom: 14,
  },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.line,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14,
  },
  dropdownText: { color: SAC.text, fontFamily: FONTS.med, fontSize: 14 },
  dropdownOption: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6 },
  dropdownOptionSelected: { backgroundColor: 'rgba(139,92,246,0.15)' },
  dropdownOptionText: { color: SAC.text, fontFamily: FONTS.med, fontSize: 13 },
  dropdownOptionTextSelected: { color: '#8B5CF6', fontFamily: FONTS.bold, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.line },
  modalCancelText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 14 },
  modalSaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, backgroundColor: SAC.violet },
  modalSaveText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  regStats: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 13 },
  regRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SAC.line },
  regName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 },
  regEmail: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  regDate: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  inviteSection: { marginTop: 8, gap: 8 },
  inviteLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  inviteUrlRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 10,
  },
  inviteUrl: { color: SAC.text, fontFamily: FONTS.med, fontSize: 12, flex: 1 },
  inviteCopyBtn: { backgroundColor: SAC.violet, borderRadius: 8, padding: 6 },
  inviteEmailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SAC.violet, borderRadius: 10, paddingVertical: 10,
    justifyContent: 'center',
  },
  inviteEmailBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
});
