/**
 * SkillsReviewModal — review skills found in the resume, add/remove manual
 * skills, and confirm the profile in one pass.
 *
 * Data:  GET  /api/users/me/skills/summary
 *        POST /api/users/me/skills/confirm {add, remove}
 *        POST /api/users/me/skills {skill}            (manual add)
 *        DELETE /api/users/me/skills/{name}           (manual remove)
 *        GET  /api/skills/suggest?q=                  (typeahead)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Check, Plus, Search, X, Wrench, FileText } from 'lucide-react-native';
import { Modal } from '@/src/ui/Modal';
import { Button, Txt } from '@/src/ui/primitives';
import { usePortalTheme } from '@/src/ui/theme';
import { useToast } from './Toast';
import {
  getMySkillsSummary, confirmSkills, addManualSkill, removeManualSkill, suggestSkills,
  type SkillsSummary, type SkillSuggestion,
} from '@/src/models/services/skills';

export default function SkillsReviewModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const t = usePortalTheme();
  const toast = useToast();
  const [summary, setSummary] = useState<SkillsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [adding, setAdding] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getMySkillsSummary();
      setSummary(s);
      // Default: every proposed skill is selected for confirmation.
      const proposed = s.review?.status === 'pending'
        ? (s.review.proposed_skills || []).map((p) => p.id)
        : [];
      setSelected(new Set(proposed));
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) { load(); setQuery(''); setSuggestions([]); }
  }, [visible, load]);

  const skillNames = summary ? new Set((summary.skills || []).map((s) => s.toLowerCase())) : new Set<string>();
  const profileNames = summary ? new Set((summary.profile || []).map((p) => p.name.toLowerCase())) : new Set<string>();

  const hasPendingReview = summary?.review?.status === 'pending' && (summary.review.proposed_skills?.length || 0) > 0;
  const proposed = hasPendingReview ? summary!.review!.proposed_skills! : [];

  const onQueryChange = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    if (v.trim().length < 2) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const r = await suggestSkills(v.trim(), 8);
        const already = Array.from(skillNames);
        setSuggestions((r.suggestions || []).filter((s) => !already.includes(s.name.toLowerCase())).slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addManual = async (s: SkillSuggestion) => {
    setAdding(true);
    try {
      await addManualSkill(s.name);
      setQuery('');
      setSuggestions([]);
      await load();
      toast.success(`Added ${s.name}`);
    } catch {
      toast.error(`Could not add ${s.name}`);
    } finally {
      setAdding(false);
    }
  };

  const removeManual = async (name: string) => {
    try {
      await removeManualSkill(name);
      await load();
    } catch {
      toast.error(`Could not remove ${name}`);
    }
  };

  const doConfirm = async () => {
    setConfirming(true);
    try {
      await confirmSkills(Array.from(selected), proposed.map((p) => p.id).filter((id) => !selected.has(id)));
      await load();
      toast.success('Skills confirmed');
      onDone?.();
      onClose();
    } catch {
      toast.error('Could not confirm skills');
    } finally {
      setConfirming(false);
    }
  };

  const manualSkills = (summary?.skills || []).filter((n) => !profileNames.has(n.toLowerCase()));
  const footer = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button variant="ghost" size="sm" title="Cancel" onPress={onClose} testID="skills-cancel" />
      {hasPendingReview && (
        <Button
          variant="primary" size="sm" title={`Confirm all (${proposed.length})`}
          onPress={doConfirm} loading={confirming} testID="skills-confirm-all"
        />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="My skills"
      subtitle={hasPendingReview
        ? 'We found skills in your resume. Review, add or remove, then confirm.'
        : 'Skills that power your match scores.'}
      footer={hasPendingReview ? footer : undefined}
      testID="skills-review-modal"
    >
      {loading && !summary ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <View style={{ gap: 18 }}>
          {hasPendingReview && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileText size={13} color={t.info} />
                <Txt variant="caption" tone="muted">{proposed.length} proposed from your resume</Txt>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {proposed.map((p) => {
                  const on = selected.has(p.id);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => toggle(p.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${on ? 'Remove' : 'Confirm'} ${p.name}`}
                      testID={`skills-chip-${p.id}`}
                      style={[
                        {
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                          backgroundColor: on ? t.infoBg : t.surface2,
                          borderColor: on ? t.info + '88' : t.border, borderWidth: 1,
                        },
                      ]}
                    >
                      <Check size={12} color={on ? t.info : t.textDim} />
                      <Text style={{ color: on ? t.info : t.textDim, fontSize: 12, fontFamily: t.typo.body600 as any }}>
                        {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Txt variant="caption" tone="muted">Add a skill</Txt>
            <View style={{ gap: 6 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                height: 40, paddingHorizontal: 12, borderRadius: 10,
                backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border,
              }}>
                <Search size={14} color={t.textDim} />
                <TextInput value={query} onChangeText={onQueryChange} placeholder="Type a skill, e.g. Python"
                  placeholderTextColor={t.textDim} testID="skills-typeahead"
                  style={{ flex: 1, color: t.text, fontSize: 13.5 }} />
                {adding && <ActivityIndicator size="small" color={t.accent} />}
              </View>
              {suggestions.length > 0 && (
                <View style={{
                  backgroundColor: t.surface2, borderWidth: 1, borderColor: t.borderHi,
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  {suggestions.map((s) => (
                    <Pressable key={s.id} onPress={() => addManual(s)} testID={`skills-sugg-${s.id}`}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 12, paddingVertical: 9,
                        borderBottomWidth: 1, borderBottomColor: t.border,
                      }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Plus size={13} color={t.accent} />
                        <Text style={{ color: t.text, fontSize: 13, fontFamily: t.typo.body600 as any }}>{s.name}</Text>
                        {s.category ? (
                          <Text style={{ color: t.textDim, fontSize: 11, fontFamily: t.typo.body500 as any }}>{s.category}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Wrench size={13} color={t.success} />
              <Txt variant="caption" tone="muted">{manualSkills.length} added manually</Txt>
            </View>
            {manualSkills.length === 0 ? (
              <Txt variant="caption" tone="dim">None yet — type above to add one.</Txt>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {manualSkills.map((n) => (
                  <Pressable key={n} onPress={() => removeManual(n)} testID={`skills-manual-${n.toLowerCase()}`}
                    accessibilityLabel={`Remove ${n}`}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                      backgroundColor: t.successBg, borderColor: t.success + '55', borderWidth: 1,
                    }}>
                    <Text style={{ color: t.success, fontSize: 12, fontFamily: t.typo.body600 as any }}>{n}</Text>
                    <X size={11} color={t.success} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}

