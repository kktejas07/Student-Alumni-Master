// TAB 8 — Pages (policy/service content manager, Lexical-editor backed) + the shared BrandingField — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { Pencil, Check, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { request } from '@/src/models/services/api';
import LexicalEditor from '@/src/views/web/portals/superadmin/views/LexicalEditor';
import { s, previewStyles } from './settingsStyles';
import { Loading } from './settingsWidgets';

/* ═════════════════════════════════════════════════════════════════
 * TAB 8 — Pages (policy/service content manager)
 * ═══════════════════════════════════════════════════════════════ */
export function PagesTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try { setPages(await request<any[]>('/admin/pages')); } catch {}
      setLoading(false);
    })();
  }, []);

  const savePage = async (key: string) => {
    try {
      await request<any>(`/admin/pages/${key}`, {
        method: 'PATCH',
        body: { content: editContent, active: editing?.active ?? true },
      });
      onSaved('Page updated');
      setEditing(null);
      setPreview(false);
      const updated = await request<any[]>('/admin/pages');
      setPages(updated);
    } catch { onSaved('Failed to update page'); }
  };

  if (loading) return <Loading />;

  if (editing) {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => { setEditing(null); setPreview(false); }} style={s.linkBtn}>
            <ArrowLeft size={16} color="#fff" />
            <Text style={s.linkBtnText}>Back</Text>
          </Pressable>
          <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18 }}>{editing.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: '#94a3b8', fontFamily: FONTS.med, fontSize: 12 }}>Route: {editing.route}</Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setPreview(!preview)}
            style={[s.secondaryBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
          >
            {preview ? <Minimize2 size={14} color="#94a3b8" /> : <Maximize2 size={14} color="#94a3b8" />}
            <Text style={s.secondaryBtnText}>{preview ? 'Edit' : 'Preview'}</Text>
          </Pressable>
          {!preview && (
            <Pressable
              onPress={async () => {
                await savePage(editing.key);
              }}
              style={s.primaryBtn}
            >
              <Check size={14} color="#fff" />
              <Text style={s.primaryBtnText}>Save</Text>
            </Pressable>
          )}
        </View>
        {preview ? (
          <View style={previewStyles.container}>
            <View style={previewStyles.chrome}>
              <Text style={previewStyles.title}>{editing.title}</Text>
              <View style={previewStyles.divider} />
              <ScrollView style={previewStyles.scrollArea}>
                <div
                  className="page-preview"
                  dangerouslySetInnerHTML={{ __html: editContent }}
                  style={{
                    color: '#e2e8f0',
                    fontFamily: 'DMSans_400Regular, sans-serif',
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                />
              </ScrollView>
            </View>
            <Text style={previewStyles.hint}>
              This is a live preview of how the page will look. Any unsaved changes are shown here.
            </Text>
          </View>
        ) : (
          <>
            <LexicalEditor value={editContent} onChange={setEditContent} />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => { setEditing(null); setPreview(false); }} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      <Text style={{ color: '#94a3b8', fontFamily: FONTS.med, fontSize: 13, marginBottom: 4 }}>
        Manage policy and content pages displayed in the footer.
      </Text>
      <View style={s.toolGrid}>
        {pages.map((p) => (
          <View key={p.key} style={s.toolCard}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 14 }}>{p.title}</Text>
              <Text style={{ color: '#64748b', fontFamily: FONTS.med, fontSize: 11 }}>{p.route}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.active ? '#22c55e' : '#ef4444' }} />
                <Text style={{ color: p.active ? '#22c55e' : '#ef4444', fontFamily: FONTS.bold, fontSize: 10 }}>
                  {p.active ? 'Published' : 'Hidden'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => { setEditing(p); setEditContent(p.content || ''); }}
              style={[s.idActionBtn, { paddingHorizontal: 10, paddingVertical: 6 }]}
            >
              <Pencil size={12} color="#fff" />
              <Text style={s.idActionText}>Edit</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}


export function BrandingField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: 12,
          color: '#e2e8f0',
          fontSize: 13,
        }}
      />
    </View>
  );
}
