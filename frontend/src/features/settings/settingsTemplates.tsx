// TAB 10 — Templates (email/notification template editor) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Eye } from 'lucide-react-native';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { getBaseUrl } from '@/src/lib/env';
import { s } from './settingsStyles';



export function TemplatesTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [subTab, setSubTab] = useState<'pass' | 'invoice' | 'email' | 'branding'>('pass');
  const [defaultTemplate, setDefaultTemplate] = useState('aurora');
  const [invoiceTemplate, setInvoiceTemplate] = useState('modern');
  const [emailStyle, setEmailStyle] = useState('modern');
  const [brandColor, setBrandColor] = useState('#2563EB');
  const [brandName, setBrandName] = useState('Student Alumni');
  const [emailFooter, setEmailFooter] = useState('Student Alumni Cell — Empowering the next generation of leaders.');
  const [saving, setSaving] = useState(false);
  // removed useToast - using onSaved

  useEffect(() => {
    (async () => {
      try {
        const base = getBaseUrl();
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        const resp = await fetch(`${base}/api/echo/admin/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const d = await resp.json();
          setDefaultTemplate(d.default_ticket_template || 'aurora');
          setInvoiceTemplate(d.default_invoice_template || 'modern');
          setEmailStyle(d.default_email_style || 'modern');
          setBrandColor(d.email_brand_color || '#2563EB');
          setBrandName(d.brand_name || 'Student Alumni');
          setEmailFooter(d.email_footer || '');
        }
      } catch { /* use defaults */ }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const base = getBaseUrl();
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          default_ticket_template: defaultTemplate,
          default_invoice_template: invoiceTemplate,
          default_email_style: emailStyle,
          email_brand_color: brandColor,
          brand_name: brandName,
          email_footer: emailFooter,
        }),
      });
      if (!resp.ok) throw new Error('Failed to save');
      onSaved('Templates saved');
    } catch (err: any) {
      onSaved(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fetchPreview = async (type: string, tplId: string) => {
    const base = getBaseUrl();
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const url = type === 'invoice'
        ? `${base}/api/echo/admin/settings/preview/invoice/${tplId}`
        : `${base}/api/echo/tickets/preview/${tplId}`;
      const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!resp.ok) throw new Error('Preview not available');
      const data = await resp.json();
      const w = window.open('', '_blank');
      if (w) { w.document.write(data.html); w.document.close(); }
    } catch (err: any) {
      onSaved(err?.message || 'Could not load preview');
    }
  };

  const TemplatePicker = ({ label, options, value, onChange, previewType }: {
    label: string; options: { id: string; name: string; desc: string; gradient: string }[];
    value: string; onChange: (v: string) => void; previewType: string;
  }) => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {options.map((tpl) => (
          <Pressable key={tpl.id} onPress={() => onChange(tpl.id)} style={{
            width: 160, borderRadius: 10, borderWidth: 2,
            borderColor: value === tpl.id ? '#2563EB' : 'rgba(255,255,255,0.08)',
            backgroundColor: value === tpl.id ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.02)',
            padding: 14, cursor: 'pointer',
          }}>
            <View style={{ height: 6, borderRadius: 3, marginBottom: 10, background: tpl.gradient }} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: value === tpl.id ? '#93C5FD' : '#e2e8f0' }}>{tpl.name}</Text>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: '#64748b', marginTop: 3 }}>{tpl.desc}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => fetchPreview(previewType, value)} style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        backgroundColor: 'rgba(37,99,235,0.12)', borderRadius: 8,
        paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(37,99,235,0.25)',
        cursor: 'pointer', marginTop: 4,
      }}>
        <Eye size={13} color="#60A5FA" />
        <Text style={{ fontFamily: FONTS.semibold, fontSize: 12, color: '#93C5FD' }}>Preview Template</Text>
      </Pressable>
    </View>
  );

  const subTabs = [
    { id: 'pass' as const, label: 'Pass / Ticket' },
    { id: 'invoice' as const, label: 'Invoice' },
    { id: 'email' as const, label: 'Email' },
    { id: 'branding' as const, label: 'Branding' },
  ];

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#f1f5f9' }}>Templates & Branding</Text>
      <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: '#94a3b8' }}>
        Configure default templates for passes, invoices, and emails across all events.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {subTabs.map((t) => (
          <Pressable key={t.id} onPress={() => setSubTab(t.id)} style={{
            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, cursor: 'pointer',
            borderColor: subTab === t.id ? '#2563EB' : 'rgba(255,255,255,0.08)',
            backgroundColor: subTab === t.id ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.02)',
          }}>
            <Text style={{ fontFamily: FONTS.semibold, fontSize: 12, color: subTab === t.id ? '#93C5FD' : '#94a3b8' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {subTab === 'pass' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Pass / Ticket Templates</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Default entry pass style for all ECHO events.</Text>
          <TemplatePicker label="Default Template" previewType="pass" value={defaultTemplate} onChange={setDefaultTemplate} options={[
            { id: 'aurora', name: 'Aurora', desc: 'Dark gradient, glow accents', gradient: 'linear-gradient(135deg,#312e81,#4C1D95)' },
            { id: 'classic', name: 'Classic', desc: 'White + purple header', gradient: 'linear-gradient(135deg,#fff,#f3f4f6)' },
            { id: 'minimal', name: 'Minimal', desc: 'Bare-bones borderless', gradient: 'linear-gradient(135deg,#f9fafb,#e5e7eb)' },
          ]} />
        </View>
      )}

      {subTab === 'invoice' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Invoice Templates</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Default invoice style for paid registrations.</Text>
          <TemplatePicker label="Default Invoice" previewType="invoice" value={invoiceTemplate} onChange={setInvoiceTemplate} options={[
            { id: 'modern', name: 'Modern', desc: 'Gradient header, card layout', gradient: 'linear-gradient(135deg,#2563EB,#1E40AF)' },
            { id: 'minimal', name: 'Minimal', desc: 'Clean white, thin borders', gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
            { id: 'classic', name: 'Classic', desc: 'Dark header, traditional', gradient: 'linear-gradient(135deg,#0f172a,#1e293b)' },
          ]} />
        </View>
      )}

      {subTab === 'email' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Email Templates</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Style for transactional emails.</Text>
          <TemplatePicker label="Email Style" previewType="pass" value={emailStyle} onChange={setEmailStyle} options={[
            { id: 'modern', name: 'Modern', desc: 'Purple gradient header', gradient: 'linear-gradient(135deg,#2563EB,#1E40AF)' },
            { id: 'minimal', name: 'Minimal', desc: 'Clean, no gradient', gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
            { id: 'professional', name: 'Professional', desc: 'Dark header, corporate', gradient: 'linear-gradient(135deg,#0f172a,#334155)' },
          ]} />
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email Footer</Text>
            <TextInput value={emailFooter} onChangeText={setEmailFooter}
              placeholder="Student Alumni Cell — Empowering the next generation of leaders."
              placeholderTextColor="#475569" multiline numberOfLines={3}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 13, minHeight: 60, textAlignVertical: 'top' }} />
          </View>
        </View>
      )}

      {subTab === 'branding' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Branding</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Brand settings for emails, passes, and invoices.</Text>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Brand Name</Text>
            <TextInput value={brandName} onChangeText={setBrandName} placeholder="Student Alumni"
              placeholderTextColor="#475569"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 13 }} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Brand Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="color" value={brandColor} onChange={(e: any) => setBrandColor(e.target.value)}
                style={{ width: 44, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
              <TextInput value={brandColor} onChangeText={setBrandColor} placeholder="#2563EB"
                placeholderTextColor="#475569"
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 13 }} />
            </View>
          </View>
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: brandColor + '18', borderWidth: 1, borderColor: brandColor + '40' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: brandColor }}>Preview</Text>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              This is how {brandName} will appear in emails and passes.
            </Text>
          </View>
        </View>
      )}

      <Pressable onPress={save} disabled={saving} style={{
        backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center', cursor: 'pointer', opacity: saving ? 0.6 : 1,
      }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>{saving ? 'Saving...' : 'Save All Settings'}</Text>
      </Pressable>
    </View>
  );
}
