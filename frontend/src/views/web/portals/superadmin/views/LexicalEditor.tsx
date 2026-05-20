// @ts-nocheck
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput as RNTextInput, Modal, ActivityIndicator } from 'react-native';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Quote, Undo, Redo, Sparkles, X, Send,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { request } from '@/src/models/services/api';

export default function LexicalEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const contentRef = useRef(value);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  useEffect(() => {
    contentRef.current = value;
  }, [value]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = document.createElement('style');
    el.textContent = EDITOR_CSS;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;
    const container = containerRef.current;
    const div = document.createElement('div');
    div.className = 'lex-editor-input';
    div.contentEditable = 'true';
    div.innerHTML = contentRef.current || '';
    div.addEventListener('input', () => {
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

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    const el = editorRef.current;
    if (el) { el.focus(); onChange(el.innerHTML); }
  };

  const handleHeading = (tag: string) => {
    document.execCommand('formatBlock', false, `<${tag}>`);
    const el = editorRef.current;
    if (el) { el.focus(); onChange(el.innerHTML); }
  };

  const handleAiAssist = async (prompt: string) => {
    const resp = await request<{ content: string }>('/admin/pages/ai-assist', {
      method: 'POST',
      body: { prompt, current_content: contentRef.current },
    });
    if (resp?.content && editorRef.current) {
      editorRef.current.innerHTML = resp.content;
      onChange(resp.content);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <RNTextInput
        style={fallbackStyle.input}
        multiline
        value={value}
        onChangeText={onChange}
        placeholder="Enter HTML content..."
        placeholderTextColor="#64748b"
      />
    );
  }

  return (
    <View>
      <View style={wrap.toolbar}>
        <View style={wrap.group}>
          <Pressable key="bold" onPress={() => exec('bold')} style={wrap.btn}>
            <Bold size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="italic" onPress={() => exec('italic')} style={wrap.btn}>
            <Italic size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="underline" onPress={() => exec('underline')} style={wrap.btn}>
            <Underline size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="strike" onPress={() => exec('strikeThrough')} style={wrap.btn}>
            <Strikethrough size={15} color="#94a3b8" />
          </Pressable>
          <View style={{ width: 1, height: 20, backgroundColor: '#334155', marginHorizontal: 4 }} />
          <Pressable key="h1" onPress={() => handleHeading('h1')} style={wrap.btn}>
            <Heading1 size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="h2" onPress={() => handleHeading('h2')} style={wrap.btn}>
            <Heading2 size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="blockquote" onPress={() => exec('formatBlock', '<blockquote>')} style={wrap.btn}>
            <Quote size={15} color="#94a3b8" />
          </Pressable>
          <View style={{ width: 1, height: 20, backgroundColor: '#334155', marginHorizontal: 4 }} />
          <Pressable key="ul" onPress={() => exec('insertUnorderedList')} style={wrap.btn}>
            <List size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="ol" onPress={() => exec('insertOrderedList')} style={wrap.btn}>
            <ListOrdered size={15} color="#94a3b8" />
          </Pressable>
        </View>
        <View style={wrap.group}>
          <Pressable key="undo" onPress={() => { document.execCommand('undo'); const el = editorRef.current; if (el) onChange(el.innerHTML); }} style={wrap.btn}>
            <Undo size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="redo" onPress={() => { document.execCommand('redo'); const el = editorRef.current; if (el) onChange(el.innerHTML); }} style={wrap.btn}>
            <Redo size={15} color="#94a3b8" />
          </Pressable>
          <Pressable key="ai" onPress={() => setAiModalVisible(true)} style={wrap.aiBtn}>
            <Sparkles size={14} color="#F59E0B" />
            <Text style={wrap.aiLabel}>AI Assist</Text>
          </Pressable>
        </View>
      </View>
      <View style={wrap.editorBox} ref={containerRef} />
      <View style={wrap.hintBar}>
        <Text style={wrap.hint}>Supports headings, lists, bold, italic & more</Text>
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
      <View style={aim.backdrop}>
        <View style={aim.card}>
          <View style={aim.head}>
            <Text style={aim.title}>AI Content Assist</Text>
            <Pressable onPress={onClose} style={aim.closeBtn}>
              <X size={16} color="#94a3b8" />
            </Pressable>
          </View>
          <View style={aim.body}>
            <Text style={aim.desc}>
              Describe what you want to generate, rewrite, or improve. For example: "Write a paragraph about student benefits" or "Make this more professional".
            </Text>
            <RNTextInput
              style={aim.input}
              multiline
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Enter your prompt..."
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={aim.footer}>
            <Pressable onPress={onClose} style={aim.cancelBtn}>
              <Text style={aim.cancelText}>Cancel</Text>
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

const EDITOR_CSS = `
  .lex-editor-input {
    min-height: 400px;
    padding: 16px;
    font-family: 'DMSans_400Regular', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #e2e8f0;
    outline: none;
    background-color: #0f172a;
    border: 1px solid #334155;
    border-top: none;
    border-radius: 0 0 10px 10px;
    resize: vertical;
    cursor: text;
  }
  .lex-editor-input:focus {
    border-color: #F59E0B;
  }
  .lex-editor-input:empty:before {
    content: attr(data-placeholder);
    color: #64748b;
    pointer-events: none;
  }
  .lex-editor-input p { margin: 0 0 8px; }
  .lex-editor-input h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; color: #fff; }
  .lex-editor-input h2 { font-size: 20px; font-weight: 700; margin: 14px 0 6px; color: #fff; }
  .lex-editor-input ul, .lex-editor-input ol { margin: 4px 0; padding-left: 24px; }
  .lex-editor-input li { margin: 2px 0; }
  .lex-editor-input blockquote { border-left: 3px solid #F59E0B; padding-left: 12px; margin: 8px 0; color: #94a3b8; font-style: italic; }
`;

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
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderTopWidth: 0,
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
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
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
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
  sendText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
});
