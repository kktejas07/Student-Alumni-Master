// TAB 9 — Branding (logos, favicons, site meta + address/phone/email fields) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, Platform, Image } from 'react-native';
import { Upload } from 'lucide-react-native';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { Card } from '@/src/views/web/portals/superadmin/applekit';
import { request } from '@/src/models/services/api';
import { getBaseUrl } from '@/src/lib/env';
import { s } from './settingsStyles';
import { BrandingField } from './settingsPages';


export function BrandingTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const logoRef = useRef<any>(null);
  const faviconRef = useRef<any>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [brandName, setBrandName] = useState('StudentAlumni');
  const [copyright, setCopyright] = useState('2026 StudentAlumni. All rights reserved.');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const base = getBaseUrl();
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        const resp = await fetch(`${base}/api/echo/admin/branding`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const d = await resp.json();
          setLogoUrl(d.logo_url || '');
          setFaviconUrl(d.favicon_url || '');
          setBrandName(d.brand_name || 'StudentAlumni');
          setCopyright(d.copyright || '2026 StudentAlumni. All rights reserved.');
          setAddress(d.address || '');
          setPhone(d.phone || '');
          setEmail(d.email || '');
          setWebsite(d.website || '');
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
      const resp = await fetch(`${base}/api/echo/admin/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          logo_url: logoUrl, favicon_url: faviconUrl, brand_name: brandName,
          copyright, address, phone, email, website,
        }),
      });
      if (!resp.ok) throw new Error('Failed to save');
      onSaved('Branding saved');
    } catch (err: any) {
      onSaved(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandingFile = async (file: File, kind: 'logo' | 'favicon') => {
    if (!file) return;
    if (kind === 'logo') setLogoUploading(true); else setFaviconUploading(true);
    try {
      if (Platform.OS === 'web' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const preview = URL.createObjectURL(file);
        if (kind === 'logo') setLogoUrl(preview); else setFaviconUrl(preview);
      }
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res: any = await request<any>(`/admin/upload?folder=${encodeURIComponent('branding')}`, { method: 'POST', body: fd });
      if (res?.url) {
        if (kind === 'logo') setLogoUrl(res.url); else setFaviconUrl(res.url);
        onSaved(kind === 'logo' ? 'Logo uploaded' : 'Favicon uploaded');
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      onSaved(`Upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      if (kind === 'logo') setLogoUploading(false); else setFaviconUploading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ padding: 20, gap: 16 }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Branding & Identity</Text>
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
          Configure logo, favicon, and contact information displayed across the platform.
        </Text>

        <BrandingField label="Brand Name" value={brandName} onChange={setBrandName} placeholder="StudentAlumni" />
        <BrandingField label="Logo URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/logo.png" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => logoRef.current?.click?.()}
            disabled={logoUploading}
            style={{
              backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6,
              cursor: 'pointer', opacity: logoUploading ? 0.6 : 1,
            }}
          >
            <Upload size={14} color="#A78BFA" />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: '#A78BFA' }}>
              {logoUploading ? 'Uploading logo…' : 'Upload logo file'}
            </Text>
          </Pressable>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.muted }}>
            PNG/JPG/WebP up to 5 MB{logoUrl ? ' — or paste a URL above' : ''}
          </Text>
          {Platform.OS === 'web' && (
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrandingFile(f, 'logo'); }} />
          )}
        </View>
        <BrandingField label="Favicon URL" value={faviconUrl} onChange={setFaviconUrl} placeholder="https://example.com/favicon.png" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => faviconRef.current?.click?.()}
            disabled={faviconUploading}
            style={{
              backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6,
              cursor: 'pointer', opacity: faviconUploading ? 0.6 : 1,
            }}
          >
            <Upload size={14} color="#A78BFA" />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: '#A78BFA' }}>
              {faviconUploading ? 'Uploading favicon…' : 'Upload favicon file'}
            </Text>
          </Pressable>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.muted }}>
            PNG/JPG/WebP up to 5 MB{faviconUrl ? ' — or paste a URL above' : ''}
          </Text>
          {Platform.OS === 'web' && (
            <input ref={faviconRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrandingFile(f, 'favicon'); }} />
          )}
        </View>
        {(logoUrl || faviconUrl) ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {logoUrl ? <Image source={{ uri: logoUrl }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="contain" /> : null}
            {faviconUrl ? <Image source={{ uri: faviconUrl }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="contain" /> : null}
          </View>
        ) : null}

        <View style={{ height: 1, backgroundColor: SAC.border, marginVertical: 4 }} />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>Contact & Legal</Text>

        <BrandingField label="Copyright" value={copyright} onChange={setCopyright} placeholder="2026 StudentAlumni. All rights reserved." />
        <BrandingField label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, Country" />
        <BrandingField label="Phone" value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
        <BrandingField label="Email" value={email} onChange={setEmail} placeholder="contact@studentalumni.ai" />
        <BrandingField label="Website" value={website} onChange={setWebsite} placeholder="https://studentalumni.ai" />

        <Pressable onPress={save} disabled={saving} style={{
          backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center', cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>{saving ? 'Saving...' : 'Save Branding'}</Text>
        </Pressable>
      </Card>
    </View>
  );
}
