import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Platform } from 'react-native';
import { Settings as SettingsIcon, Shield, UserCog, Plug, Bell, Globe, Lock } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const SECTIONS = [
  {
    id: 'general', title: 'General', icon: SettingsIcon, items: [
      { k:'platform_name',  label:'Platform name',         val:'Student Alumni',         kind:'text' as const },
      { k:'support_email',  label:'Support email',         val:'support@studentalumni.app', kind:'text' as const },
      { k:'default_currency',label:'Default currency',     val:'INR (₹)',                 kind:'text' as const },
      { k:'maintenance',    label:'Maintenance mode',      val: false,                    kind:'toggle' as const },
    ],
  },
  {
    id: 'roles', title: 'Roles & Permissions', icon: UserCog, items: [
      { k:'rbac_strict',    label:'Strict role-based access (RBAC)', val: true,  kind:'toggle' as const },
      { k:'mentor_apps',    label:'Allow self-serve mentor signup',  val: true,  kind:'toggle' as const },
      { k:'student_export', label:'Allow CSV export by college admins',val: false, kind:'toggle' as const },
    ],
  },
  {
    id: 'integrations', title: 'Integrations', icon: Plug, items: [
      { k:'stripe',  label:'Stripe',                              val:'Connected',  status:'green'  as const, kind:'status' as const },
      { k:'twilio',  label:'Twilio (SMS OTP)',                    val:'Connected',  status:'green'  as const, kind:'status' as const },
      { k:'sendgrid',label:'SendGrid (transactional email)',      val:'Connected',  status:'green'  as const, kind:'status' as const },
      { k:'linkedin',label:'LinkedIn Jobs API',                   val:'Pending key',status:'amber'  as const, kind:'status' as const },
      { k:'firebase',label:'Firebase Analytics',                  val:'Connected',  status:'green'  as const, kind:'status' as const },
      { k:'claude',  label:'Anthropic Claude (AI Insights)',       val:'Connected',  status:'green'  as const, kind:'status' as const },
    ],
  },
  {
    id: 'security', title: 'Security', icon: Shield, items: [
      { k:'2fa',          label:'Require 2FA for super admins',      val: true,  kind:'toggle' as const },
      { k:'session_ttl',  label:'Session timeout (minutes)',         val:'30',   kind:'text'   as const },
      { k:'audit_log',    label:'Verbose audit log',                  val: true,  kind:'toggle' as const },
      { k:'pwd_strength', label:'Strong password policy',             val: true,  kind:'toggle' as const },
    ],
  },
  {
    id: 'notifications', title: 'Notifications', icon: Bell, items: [
      { k:'daily_digest', label:'Daily digest email',                val: true,  kind:'toggle' as const },
      { k:'approval_pings',label:'Slack ping for new approvals',     val: true,  kind:'toggle' as const },
      { k:'risk_alerts',  label:'AI risk alerts (Claude)',           val: true,  kind:'toggle' as const },
    ],
  },
];

export function SettingsView() {
  const [, force] = useState(0);
  const onToggle = (sectionIdx: number, itemIdx: number) => {
    const it: any = SECTIONS[sectionIdx].items[itemIdx];
    it.val = !it.val;
    force((x) => x + 1);
  };

  return (
    <View style={{ gap: 14 }}>
      {SECTIONS.map((sec, si) => {
        const Icon = sec.icon;
        return (
          <View key={sec.id} style={s.card}>
            <View style={s.cardHead}>
              <View style={s.cardIcon}><Icon size={14} color={SAC.accent} /></View>
              <Text style={s.cardTitle}>{sec.title}</Text>
            </View>
            <View style={{ marginTop: 12 }}>
              {sec.items.map((it: any, ii: number) => (
                <View key={it.k} style={s.row}>
                  <Text numberOfLines={1} style={s.label}>{it.label}</Text>
                  {it.kind === 'toggle' && (
                    <Switch
                      value={!!it.val}
                      onValueChange={() => onToggle(si, ii)}
                      trackColor={{ false: 'rgba(255,255,255,0.10)', true: SAC.primary }}
                      thumbColor={it.val ? '#fff' : '#ccc'}
                      {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
                    />
                  )}
                  {it.kind === 'text' && <Text style={s.valueText}>{it.val}</Text>}
                  {it.kind === 'status' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Badge label={it.val} color={it.status} />
                      <Pressable style={s.config}><Text style={s.configText}>Configure</Text></Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.20)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: SAC.border, gap: 12 },
  label: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1, minWidth: 0 },
  valueText: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 12 },
  config: { paddingHorizontal: 11, height: 28, borderRadius: 7, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center' },
  configText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
});
