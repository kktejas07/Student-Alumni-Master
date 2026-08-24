/**
 * Page 3 — Settings & Preferences.
 * Sections: Notifications, Privacy, Suggestions/AI, App Preferences, Account.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Card, ToggleRow, SF, C } from './primitives';
import { Sun, Moon, Monitor, Lock, ShieldCheck, Download as DownloadIcon, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { TF, Field } from './primitives';

const LANGS = ['English', 'हिन्दी', 'Tamil', 'Telugu', 'Kannada', 'Marathi'];
const TZS = ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'Europe/London', 'America/Los_Angeles', 'Asia/Singapore'];

function defaultPrefs(p: any) {
  // p may be null (not just undefined) when the user hasn't set any preferences yet.
  const safe = (p && typeof p === 'object') ? p : {};
  return {
    notifications: { messages: true, requests: true, mentions: true, weekly_digest: true, new_matches: false, ...(safe.notifications || {}) },
    privacy:       { show_email: false, show_phone: false, allow_dm: true, show_online: true,                   ...(safe.privacy       || {}) },
    ai:            { goal_reminders: true, smart_suggestions: true, daily_brief: false,                         ...(safe.ai            || {}) },
    app:           { language: 'English', timezone: 'Asia/Kolkata', theme: 'dark',                              ...(safe.app           || {}) },
  };
}

interface Props {
  draft: any;
  setDraft: (updater: (d: any) => any) => void;
  showToast: (m: string) => void;
  section?: 'all' | 'notifications' | 'privacy' | 'general';
}

export function SettingsPage({ draft, setDraft, showToast, section = 'all' }: Props) {
  const prefs = defaultPrefs(draft.preferences);
  const setPref = (path: [string, string], v: any) => setDraft((d: any) => ({ ...d, preferences: { ...defaultPrefs(d.preferences), [path[0]]: { ...defaultPrefs(d.preferences)[path[0]], [path[1]]: v } } }));

  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const handleChangePassword = async () => {
    if (pwNew.length < 8) { showToast('New password must be 8+ chars'); return; }
    setPwBusy(true);
    try {
      await request('/users/me/password', { method: 'POST', body: { current_password: pwOld, new_password: pwNew } } as any);
      showToast('Password updated ✓'); setPwOld(''); setPwNew('');
    } catch (e: any) { showToast(e?.message || 'Failed to update password'); }
    setPwBusy(false);
  };

  const showNotifications = section === 'all' || section === 'notifications';
  const showPrivacy = section === 'all' || section === 'privacy';
  const showGeneral = section === 'all' || section === 'general';

  return (
    <View style={{ gap: 16 }}>
      {showNotifications && (
      <Card title="Notification Preferences" subtitle="Pick what we ping you about.">
        <ToggleRow title="New Messages" desc="Direct messages from your network." on={prefs.notifications.messages} onChange={(v) => setPref(['notifications','messages'], v)} testID="set-notif-msg" />
        <ToggleRow title="Connection Requests" desc="When someone wants to connect." on={prefs.notifications.requests} onChange={(v) => setPref(['notifications','requests'], v)} testID="set-notif-req" />
        <ToggleRow title="Mentions" desc="When someone mentions you." on={prefs.notifications.mentions} onChange={(v) => setPref(['notifications','mentions'], v)} testID="set-notif-mention" />
        <ToggleRow title="Weekly Digest" desc="A weekly summary of opportunities." on={prefs.notifications.weekly_digest} onChange={(v) => setPref(['notifications','weekly_digest'], v)} testID="set-notif-digest" />
        <ToggleRow title="New Matches" desc="Real-time pings for new matches." on={prefs.notifications.new_matches} onChange={(v) => setPref(['notifications','new_matches'], v)} testID="set-notif-matches" />
      </Card>
      )}

      {showPrivacy && (
      <Card title="Privacy Controls" subtitle="What others see about you.">
        <ToggleRow title="Show Email on Profile" desc="Allow connections to see your email." on={prefs.privacy.show_email} onChange={(v) => setPref(['privacy','show_email'], v)} testID="set-priv-email" />
        <ToggleRow title="Show Phone on Profile" desc="Allow connections to see your phone." on={prefs.privacy.show_phone} onChange={(v) => setPref(['privacy','show_phone'], v)} testID="set-priv-phone" />
        <ToggleRow title="Allow Direct Messages" desc="Connections can DM you anytime." on={prefs.privacy.allow_dm} onChange={(v) => setPref(['privacy','allow_dm'], v)} testID="set-priv-dm" />
        <ToggleRow title="Show Online Status" desc="Display the green online dot to others." on={prefs.privacy.show_online} onChange={(v) => setPref(['privacy','show_online'], v)} testID="set-priv-online" />
      </Card>
      )}

      {showGeneral && (<>
      {/* AI Coach */}
      <Card title="Suggestions & AI Coach" subtitle="Personalized nudges and goal reminders.">
        <ToggleRow title="Goal Check-in Reminders" desc="We will nudge you on your career goals." on={prefs.ai.goal_reminders} onChange={(v) => setPref(['ai','goal_reminders'], v)} testID="set-ai-goals" />
        <ToggleRow title="Smart Suggestions" desc="Get AI-curated mentor & job picks." on={prefs.ai.smart_suggestions} onChange={(v) => setPref(['ai','smart_suggestions'], v)} testID="set-ai-smart" />
        <ToggleRow title="Daily Brief" desc="A daily 30-sec personalized brief." on={prefs.ai.daily_brief} onChange={(v) => setPref(['ai','daily_brief'], v)} testID="set-ai-brief" />
      </Card>

      {/* App Preferences */}
      <Card title="App Preferences" subtitle="Localization and theme.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          <Field label="Language" half><SF value={prefs.app.language} onChange={(v) => setPref(['app','language'], v)} options={LANGS} testID="set-lang" /></Field>
          <Field label="Timezone" half><SF value={prefs.app.timezone} onChange={(v) => setPref(['app','timezone'], v)} options={TZS} testID="set-tz" /></Field>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={st.label}>Theme</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{k:'dark',l:'Dark',I:Moon},{k:'light',l:'Light',I:Sun},{k:'system',l:'System',I:Monitor}].map(({k,l,I}) => {
              const sel = prefs.app.theme === k;
              return (
                <Pressable key={k} onPress={() => setPref(['app','theme'], k)} style={[st.themeOpt, sel && st.themeOptSel]} testID={`set-theme-${k}`}>
                  <I size={14} color={sel ? '#fff' : C.text2} />
                  <Text style={[st.themeText, sel && { color: '#fff' }]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      {/* Account */}
      <Card title="Account" subtitle="Security & data controls.">
        <View style={{ gap: 10 }}>
          <Field label="Change Password">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1, minWidth: 200 }}><TF value={pwOld} onChangeText={setPwOld} secure={!showPw} placeholder="Current password" testID="set-pw-old" /></View>
              <View style={{ flex: 1, minWidth: 200 }}><TF value={pwNew} onChangeText={setPwNew} secure={!showPw} placeholder="New password (8+ chars)" testID="set-pw-new" /></View>
              <Pressable onPress={() => setShowPw((s) => !s)} style={st.iconBtn} testID="set-pw-toggle">{showPw ? <EyeOff size={14} color={C.text2} /> : <Eye size={14} color={C.text2} />}</Pressable>
              <Pressable onPress={handleChangePassword} disabled={pwBusy || !pwOld || !pwNew} style={[st.btnAccent, (pwBusy || !pwOld || !pwNew) && { opacity: 0.5 }]} testID="set-pw-save"><Lock size={13} color="#fff" /><Text style={st.btnAccentText}>{pwBusy ? 'Saving…' : 'Update'}</Text></Pressable>
            </View>
          </Field>
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.itemTitle}>Two-Factor Authentication</Text>
              <Text style={st.itemDesc}>Extra security on every login.</Text>
            </View>
            <View style={st.statusPill}><Text style={st.statusPillText}>DISABLED</Text></View>
            <Pressable onPress={() => showToast('2FA setup coming soon')} style={st.btnGhost}><ShieldCheck size={13} color={C.text} /><Text style={st.btnGhostText}>Enable</Text></Pressable>
          </View>
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.itemTitle}>Download My Data</Text>
              <Text style={st.itemDesc}>Export everything we have on you.</Text>
            </View>
            <Pressable onPress={() => showToast('Export coming soon')} style={st.btnGhost}><DownloadIcon size={13} color={C.text} /><Text style={st.btnGhostText}>Export</Text></Pressable>
          </View>
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.itemTitle}>Delete Account</Text>
              <Text style={st.itemDesc}>Permanently remove your account & data.</Text>
            </View>
            <Pressable onPress={() => showToast('Account deletion is irreversible — contact support')} style={st.btnDanger}><Trash2 size={13} color="#fff" /><Text style={st.btnDangerText}>Delete</Text></Pressable>
          </View>
        </View>
      </Card>
      </>)}
    </View>
  );
}

const st = StyleSheet.create({
  label: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  themeOpt: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  themeOptSel: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  themeText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopColor: 'rgba(255,255,255,0.05)', borderTopWidth: 1 },
  itemTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  itemDesc: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(244,63,94,0.14)', borderColor: 'rgba(244,63,94,0.40)', borderWidth: 1 },
  statusPillText: { color: '#FB7185', fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.5 },
  btnGhost: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  btnGhostText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnAccent: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 8, backgroundColor: '#A78BFA', ...({ cursor: 'pointer' } as any) },
  btnAccentText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnDanger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: '#F43F5E', ...({ cursor: 'pointer' } as any) },
  btnDangerText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
});
