// @ts-nocheck
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput as RNTextInput, Modal, ActivityIndicator } from 'react-native';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot, $getSelection, $isRangeSelection,
  FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Quote, Undo, Redo, WrapText, Sparkles,
  AlignLeft, AlignCenter, AlignRight, X, Send,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { request } from '@/src/models/services/api';

const EDITOR_THEME = {
  ltr: 'lex-ltr',
  rtl: 'lex-rtl',
  paragraph: 'lex-p',
  heading: {
    h1: 'lex-h1',
    h2: 'lex-h2',
    h3: 'lex-h3',
  },
  quote: 'lex-quote',
  list: {
    ul: 'lex-ul',
    ol: 'lex-ol',
    listitem: 'lex-li',
  },
  text: {
    bold: 'lex-bold',
    italic: 'lex-italic',
    underline: 'lex-underline',
    strikethrough: 'lex-strikethrough',
  },
};

const editorStyles = Platform.OS === 'web' ? `
  .lex-editor-container { position: relative; border-radius: 10px; overflow: hidden; }
  .lex-editor-input { min-height: 400px; padding: 16px; font-family: 'DMSans_400Regular', sans-serif; font-size: 14px; line-height: 1.6; color: #e2e8f0; outline: none; resize: vertical; }
  .lex-editor-input p { margin: 0 0 8px; }
  .lex-editor-input h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; color: #fff; }
  .lex-editor-input h2 { font-size: 20px; font-weight: 700; margin: 14px 0 6px; color: #fff; }
  .lex-editor-input h3 { font-size: 17px; font-weight: 600; margin: 12px 0 4px; color: #f1f5f9; }
  .lex-editor-input ul, .lex-editor-input ol { margin: 4px 0; padding-left: 24px; }
  .lex-editor-input li { margin: 2px 0; }
  .lex-editor-input blockquote { border-left: 3px solid #F59E0B; padding-left: 12px; margin: 8px 0; color: #94a3b8; font-style: italic; }
  .lex-bold { font-weight: 700; }
  .lex-italic { font-style: italic; }
  .lex-underline { text-decoration: underline; }
  .lex-strikethrough { text-decoration: line-through; }
  .lex-placeholder { position: absolute; top: 16px; left: 16px; color: #64748b; font-family: 'DMSans_400Regular', sans-serif; font-size: 14px; pointer-events: none; user-select: none; }
` : '';

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
          setIsStrikethrough(selection.hasFormat('strikethrough'));
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  const buttons = [
    { icon: Bold, action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'), active: isBold },
    { icon: Italic, action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'), active: isItalic },
    { icon: Underline, action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'), active: isUnderline },
    { icon: Strikethrough, action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough'), active: isStrikethrough },
    { icon: Heading1, action: () => editor.update(() => { $setBlocksType($getSelection(), () => $createHeadingNode('h1')); }) },
    { icon: Heading2, action: () => editor.update(() => { $setBlocksType($getSelection(), () => $createHeadingNode('h2')); }) },
    { icon: Quote, action: () => editor.update(() => { $setBlocksType($getSelection(), () => $createQuoteNode()); }) },
    { icon: List, action: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined) },
    { icon: ListOrdered, action: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined) },
  ];

  return (
    <View style={tb.toolbar}>
      <View style={tb.group}>
        {buttons.map((b, i) => (
          <Pressable key={i} onPress={b.action} style={[tb.btn, b.active && tb.btnActive]}>
            <b.icon size={15} color={b.active ? '#F59E0B' : '#94a3b8'} />
          </Pressable>
        ))}
      </View>
      <View style={tb.group}>
        <Pressable onPress={() => editor.undo()} style={tb.btn}>
          <Undo size={15} color="#94a3b8" />
        </Pressable>
        <Pressable onPress={() => editor.redo()} style={tb.btn}>
          <Redo size={15} color="#94a3b8" />
        </Pressable>
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155',
    borderTopLeftRadius: 10, borderTopRightRadius: 10,
    flexWrap: 'wrap', gap: 4,
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: {
    width: 30, height: 30, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '120ms' } : {}),
  },
  btnActive: { backgroundColor: 'rgba(245,158,11,0.15)' },
});

function AiAssistButton({ onAiAssist }: { onAiAssist: () => void }) {
  return (
    <Pressable onPress={onAiAssist} style={aiBtn.btn}>
      <Sparkles size={14} color="#F59E0B" />
      <Text style={aiBtn.label}>AI Assist</Text>
    </Pressable>
  );
}

const aiBtn = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, height: 28, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '120ms' } : {}),
  },
  label: { color: '#F59E0B', fontFamily: FONTS.bold, fontSize: 11 },
});

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
  closeBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
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

export default function LexicalEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [editorRef, setEditorRef] = useState<any>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const contentRef = useRef(value);

  useEffect(() => {
    contentRef.current = value;
  }, [value]);

  const initialConfig = {
    namespace: 'PagesEditor',
    theme: EDITOR_THEME,
    onError: (error: any) => console.error(error),
  };

  const handleChange = useCallback((editorState: any, editor: any) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor);
      onChange(html);
    });
  }, [onChange]);

  const handleAiAssist = async (prompt: string) => {
    if (!editorRef) return;
    const currentHtml = contentRef.current;
    const resp = await request<{ content: string }>('/admin/pages/ai-assist', {
      method: 'POST',
      body: { prompt, current_content: currentHtml },
    });
    if (resp?.content) {
      editorRef.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(resp.content, 'text/html');
        const nodes = $generateNodesFromDOM(editorRef, dom);
        $getRoot().clear().append(...nodes);
      });
    }
  };

  const onEditorReady = (editor: any) => {
    setEditorRef(editor);
    if (contentRef.current) {
      try {
        editor.update(() => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(contentRef.current, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().clear().append(...nodes);
        });
      } catch (e) {
        console.error('Failed to load initial content', e);
      }
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
    <>
      <style>{editorStyles}</style>
      <View style={wrap.wrapper}>
        <LexicalComposer initialConfig={initialConfig}>
          <Toolbar />
          <View style={wrap.editorBox}>
            <RichTextPlugin
              contentEditable={<ContentEditable className="lex-editor-input" />}
              placeholder={<Text className="lex-placeholder">Start writing...</Text>}
              ErrorBoundary={({ children, onError }) => <>{children}</>}
            />
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />
            <OnChangePlugin onChange={handleChange} />
            <InitializePlugin onInit={onEditorReady} />
          </View>
          <View style={wrap.bottomBar}>
            <AiAssistButton onAiAssist={() => setAiModalVisible(true)} />
            <Text style={wrap.hint}>Supports headings, lists, bold, italic & more</Text>
          </View>
        </LexicalComposer>
      </View>
      <AiPromptModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSend={handleAiAssist}
      />
    </>
  );
}

function InitializePlugin({ onInit }: { onInit: (editor: any) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => { onInit(editor); }, [editor, onInit]);
  return null;
}

const wrap = StyleSheet.create({
  wrapper: {
    borderRadius: 10, borderWidth: 1, borderColor: '#334155',
    backgroundColor: '#0f172a', overflow: 'hidden',
  },
  editorBox: { position: 'relative', minHeight: 400 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155',
  },
  hint: { color: '#64748b', fontFamily: FONTS.med, fontSize: 10.5 },
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
