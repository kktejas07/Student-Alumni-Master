// @ts-nocheck
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput as RNTextInput, Modal, ActivityIndicator } from 'react-native';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Quote, Undo, Redo, Sparkles, X, Send,
} from 'lucide-react-native';
import { FONTS } from '../tokens';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';
import { useTheme } from '@/src/theme/ThemeContext';

export default function LexicalEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const { isDark } = useTheme();
  const toast = useToast();
  const contentRef = useRef(value);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  const prevValueRef = useRef(value);

  useEffect(() => {
    contentRef.current = value;
  }, [value]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = document.createElement('style');
    el.textContent = editorCss(isDark);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [isDark]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;
    const container = containerRef.current;
    const div = document.createElement('div');
    div.className = 'lex-editor-input';
    div.contentEditable = 'true';
    div.innerHTML = contentRef.current || '';
    div.addEventListener('input', () => {
      prevValueRef.current = div.innerHTML;
      onChange(div.innerHTML);
    });
    div.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) document.execCommand('redo');
        else document.execCommand('undo');
        onChange(div.innerHTML);
      }
    });
    container.appendChild(div);
    editorRef.current = div;
    return () => { container.removeChild(div); editorRef.current = null; };
  }, []);

  // Sync external value changes (e.g., loading a draft) into the contentEditable div.
  // Only updates when the value actually changed externally (not from user typing).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      el.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd: string, val?: string) => {
    const el = editorRef.current;
    if (el) { el.focus(); }
    document.execCommand(cmd, false, val);
    if (el) { onChange(el.innerHTML); }
  };

  const handleHeading = (tag: string) => {
    const el = editorRef.current;
    if (el) { el.focus(); }
    document.execCommand('formatBlock', false, `<${tag}>`);
    if (el) { onChange(el.innerHTML); }
  };

  const handleAiAssist = async (prompt: string) => {
    try {
      const resp = await request<{ content: string }>('/admin/pages/ai-assist', {
        method: 'POST',
        body: { prompt, current_content: contentRef.current },
      });
      if (resp?.content && editorRef.current) {
        editorRef.current.innerHTML = resp.content;
        onChange(resp.content);
      }
    } catch (e: any) {
      console.warn('AI Assist failed:', e?.message);
      toast.error('AI Assist failed', e?.message || 'Please try again.');
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <RNTextInput
        style={[
          fallbackStyle.input,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: isDark ? '#334155' : '#cbd5e1',
            color: isDark ? '#f1f5f9' : '#0f172a',
          },
        ]}
        multiline
        value={value}
        onChangeText={onChange}
        placeholder="Enter HTML content..."
        placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
      />
    );
  }

  return (
    <View>
      <View style={[
        wrap.toolbar,
        {
          backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : '#f8fafc',
          borderColor: isDark ? '#334155' : '#e2e8f0',
        },
      ]}>
        <View style={wrap.group}>
          <Pressable key="bold" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Bold size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="italic" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Italic size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="underline" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Underline size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="strike" onMouseDown={(e) => { e.preventDefault(); exec('strikeThrough'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Strikethrough size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <View style={{ width: 1, height: 20, backgroundColor: isDark ? '#334155' : '#cbd5e1', marginHorizontal: 4 }} />
          <Pressable key="h1" onMouseDown={(e) => { e.preventDefault(); handleHeading('h1'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Heading1 size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="h2" onMouseDown={(e) => { e.preventDefault(); handleHeading('h2'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Heading2 size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="blockquote" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', '<blockquote>'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Quote size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <View style={{ width: 1, height: 20, backgroundColor: isDark ? '#334155' : '#cbd5e1', marginHorizontal: 4 }} />
          <Pressable key="ul" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <List size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="ol" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <ListOrdered size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
        </View>
        <View style={wrap.group}>
          <Pressable key="undo" onMouseDown={(e) => { e.preventDefault(); const el = editorRef.current; if (el) { el.focus(); document.execCommand('undo'); onChange(el.innerHTML); } }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Undo size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="redo" onMouseDown={(e) => { e.preventDefault(); const el = editorRef.current; if (el) { el.focus(); document.execCommand('redo'); onChange(el.innerHTML); } }} style={({ hovered }: any) => [wrap.btn, hovered && { backgroundColor: isDark ? '#334155' : 'rgba(226,232,240,0.7)' }]}>
            <Redo size={15} color={isDark ? '#cbd5e1' : '#334155'} />
          </Pressable>
          <Pressable key="ai" onPress={() => setAiModalVisible(true)} style={({ hovered }: any) => [
            wrap.aiBtn,
            {
              backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb',
              borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a',
            },
            hovered && { backgroundColor: isDark ? 'rgba(245,158,11,0.22)' : '#fef3c7' },
          ]}>
            <Sparkles size={14} color={isDark ? '#fcd34d' : '#92400e'} />
            <Text style={[wrap.aiLabel, { color: isDark ? '#fcd34d' : '#92400e' }]}>AI Assist</Text>
          </Pressable>
        </View>
      </View>
      <View style={[
        wrap.editorBox,
        {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: isDark ? '#334155' : '#cbd5e1',
          ...(Platform.OS === 'web' ? { boxShadow: isDark ? 'none' : '0 1px 2px rgba(15,23,42,0.06)' } as any : {}),
        },
      ]} ref={containerRef} />
      <View style={[
        wrap.hintBar,
        {
          backgroundColor: isDark ? '#0f172a' : 'rgba(248,250,252,0.7)',
          borderColor: isDark ? '#1e293b' : '#e2e8f0',
        },
      ]}>
        <Text style={[wrap.hint, { color: isDark ? '#94a3b8' : '#64748b' }]}>Supports headings, lists, links, bold & italic</Text>
      </View>
      <AiPromptModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSend={handleAiAssist}
      />
    </View>
  );
}

function AiPromptModal({ visible, onClose, onSend }: { visible: boolean; onClose: () => void; onSend: (prompt: string) => Promise<void> }) {
  const { isDark } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try { await onSend(prompt); } catch {}
    setLoading(false);
    setPrompt('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[aim.backdrop, { backgroundColor: isDark ? 'rgba(2,6,23,0.75)' : 'rgba(15,23,42,0.45)' }]}>
        <View style={[
          aim.card,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1' },
        ]}>
          <View style={[aim.head, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <Text style={[aim.title, { color: isDark ? '#f8fafc' : '#0f172a' }]}>AI Content Assist</Text>
            <Pressable onPress={onClose} style={aim.closeBtn}>
              <X size={16} color={isDark ? '#cbd5e1' : '#475569'} />
            </Pressable>
          </View>
          <View style={aim.body}>
            <Text style={[aim.desc, { color: isDark ? '#cbd5e1' : '#475569' }]}>
              Describe what you want to generate, rewrite, or improve. For example: "Write a paragraph about student benefits" or "Make this more professional".
            </Text>
            <RNTextInput
              style={[
                aim.input,
                {
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                },
              ]}
              multiline
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Enter your prompt..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            />
          </View>
          <View style={[aim.footer, { borderTopColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <Pressable onPress={onClose} style={[aim.cancelBtn, { borderColor: isDark ? '#334155' : '#cbd5e1' }]}>
              <Text style={[aim.cancelText, { color: isDark ? '#cbd5e1' : '#334155' }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSend} disabled={loading || !prompt.trim()} style={[aim.sendBtn, (loading || !prompt.trim()) && { opacity: 0.5 }]}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={14} color="#fff" />
                  <Text style={aim.sendText}>Generate</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function editorCss(isDark: boolean) {
  const background = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? '#334155' : '#cbd5e1';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#475569';
  return `
  .lex-editor-input {
    min-height: 400px;
    padding: 16px;
    font-family: 'DMSans_400Regular', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: ${text};
    outline: none;
    background-color: ${background};
    border: none;
    border-radius: 0 0 10px 10px;
    resize: vertical;
    cursor: text;
  }
  .lex-editor-input:focus {
    border-color: #F59E0B;
  }
  .lex-editor-input:empty:before {
    content: attr(data-placeholder);
    color: ${isDark ? '#64748b' : '#94a3b8'};
    pointer-events: none;
  }
  .lex-editor-input p { margin: 0 0 8px; }
  .lex-editor-input h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; color: ${text}; }
  .lex-editor-input h2 { font-size: 20px; font-weight: 700; margin: 14px 0 6px; color: ${text}; }
  .lex-editor-input ul, .lex-editor-input ol { margin: 4px 0; padding-left: 24px; }
  .lex-editor-input li { margin: 2px 0; }
  .lex-editor-input blockquote { border-left: 3px solid #F59E0B; padding-left: 12px; margin: 8px 0; color: ${muted}; font-style: italic; }
`;
}

const wrap = StyleSheet.create({
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
    borderTopLeftRadius: 10, borderTopRightRadius: 10,
    flexWrap: 'wrap', gap: 4,
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: {
    width: 30, height: 30, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  editorBox: {
    minHeight: 400,
    borderRadius: 0,
    overflow: 'hidden',
  },
  hintBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
  },
  hint: { color: '#64748b', fontFamily: FONTS.med, fontSize: 10.5 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, height: 28, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  aiLabel: { color: '#F59E0B', fontFamily: FONTS.bold, fontSize: 11 },
});

const fallbackStyle = StyleSheet.create({
  input: {
    minHeight: 400, paddingHorizontal: 12, paddingTop: 10,
    color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1, borderRadius: 10,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
});

const aim = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } : {}),
  },
  card: {
    width: '100%', maxWidth: 500,
    backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } : {}),
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  title: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  body: { padding: 16, gap: 12 },
  desc: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },
  input: {
    minHeight: 100, paddingHorizontal: 12, paddingTop: 10,
    color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1, borderRadius: 10,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  footer: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
    padding: 14, borderTopWidth: 1, borderTopColor: '#334155',
  },
  cancelBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
    borderWidth: 1, borderColor: '#334155',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cancelText: { color: '#94a3b8', fontFamily: FONTS.bold, fontSize: 12 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
    backgroundColor: '#F59E0B',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  sendText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 12 },
});
