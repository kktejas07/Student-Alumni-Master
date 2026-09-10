/**
 * GraphRagVisualizer.tsx — Interactive Graph-RAG Semantic Topology & Knowledge Map
 * Visualizes multi-dimensional relationships: Students ➔ Mentors ➔ Companies ➔ Skills ➔ Events
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Network, Sparkles, Filter, Search, RefreshCw, Layers, ShieldCheck, Award } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { SAC, FONTS } from '../portals/superadmin/tokens';

export function GraphRagVisualizer() {
  const [topology, setTopology] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [activeGroup, setActiveGroup] = useState<string>('All');

  const fetchTopology = async (q?: string) => {
    setLoading(true);
    try {
      const res: any = await request('/api/ai/graph-rag/topology', {
        method: 'POST',
        body: { query: q || undefined }
      });
      setTopology(res);
      if (res?.nodes?.length) setSelectedNode(res.nodes[0]);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, []);

  const groups = ['All', 'Students', 'Mentors', 'Enterprises', 'Skills', 'Hackathons', 'Careers'];

  const filteredNodes = topology?.nodes?.filter((n: any) => {
    if (activeGroup !== 'All' && n.group !== activeGroup) return false;
    if (searchFilter && !n.label.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.iconBox}>
            <Network size={20} color="#fff" />
          </View>
          <View>
            <Text style={s.title}>Graph-RAG Semantic Knowledge Topology</Text>
            <Text style={s.sub}>Multi-dimensional entity relationship graph connecting talent, skills, and industry partners.</Text>
          </View>
        </View>
        <Pressable onPress={() => fetchTopology(searchFilter)} style={s.refreshBtn} disabled={loading}>
          <RefreshCw size={13} color="#fff" />
          <Text style={s.refreshText}>Re-Sync Graph</Text>
        </Pressable>
      </View>

      {/* Filter Bar */}
      <View style={s.filterRow}>
        <View style={s.searchWrap}>
          <Search size={14} color={SAC.muted} />
          <TextInput
            value={searchFilter}
            onChangeText={(t) => { setSearchFilter(t); fetchTopology(t); }}
            placeholder="Search entity in Graph-RAG (e.g. Google, Devender, FastAPI)..."
            placeholderTextColor={SAC.muted}
            style={s.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {groups.map((g) => (
            <Pressable
              key={g}
              onPress={() => setActiveGroup(g)}
              style={[s.groupChip, activeGroup === g && s.groupChipActive]}
            >
              <Text style={[s.groupText, activeGroup === g && { color: '#fff' }]}>{g}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading && <ActivityIndicator size="small" color="#A78BFA" style={{ marginVertical: 20 }} />}

      {/* Graph Visual Canvas */}
      {topology && (
        <View style={s.canvasWrap}>
          {/* Node Grid Map */}
          <View style={s.nodeGrid}>
            {filteredNodes.map((n: any) => {
              const isSelected = selectedNode?.id === n.id;
              const colorMap: any = {
                Students: '#3B82F6',
                Mentors: '#8B5CF6',
                Enterprises: '#10B981',
                Skills: '#F59E0B',
                Hackathons: '#EC4899',
                Careers: '#06B6D4'
              };
              const nodeColor = colorMap[n.group] || '#7C3AED';

              return (
                <Pressable
                  key={n.id}
                  onPress={() => setSelectedNode(n)}
                  style={[
                    s.nodeCard,
                    { borderColor: isSelected ? '#fff' : nodeColor },
                    isSelected && { backgroundColor: 'rgba(124,58,237,0.3)', transform: [{ scale: 1.05 }] }
                  ]}
                >
                  <View style={[s.nodeDot, { backgroundColor: nodeColor }]} />
                  <Text style={s.nodeLabel}>{n.label}</Text>
                  <Text style={s.nodeGroup}>{n.group}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Selected Node Details & Connected Edges */}
          {selectedNode && (
            <View style={s.detailPanel}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.detailTitle}>{selectedNode.label}</Text>
                <View style={s.tagBadge}><Text style={s.tagText}>{selectedNode.group}</Text></View>
              </View>

              <Text style={s.sectionHead}>CONNECTED GRAPH-RAG EDGES & RELATIONS</Text>
              <View style={{ gap: 6, marginTop: 4 }}>
                {topology.edges
                  ?.filter((e: any) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e: any, i: number) => (
                    <View key={i} style={s.edgeRow}>
                      <Text style={s.edgeRel}>— [{e.relation}] →</Text>
                      <Text style={s.edgeTarget}>
                        {e.source === selectedNode.id ? e.target : e.source}
                      </Text>
                      <Text style={s.edgeWeight}>(w: {e.weight})</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 14, padding: 18, borderRadius: 14, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  refreshText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },

  filterRow: { gap: 10 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 36, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderColor: SAC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontSize: 12, fontFamily: FONTS.med, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },

  groupChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: SAC.border, borderWidth: 1 },
  groupChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  groupText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  canvasWrap: { gap: 12, marginTop: 6 },
  nodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nodeCard: { padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, minWidth: 130, gap: 3 },
  nodeDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  nodeLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  nodeGroup: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 },

  detailPanel: { padding: 14, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)', borderWidth: 1, gap: 6 },
  detailTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#7C3AED' },
  tagText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10 },

  sectionHead: { color: '#DDD6FE', fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.5 },
  edgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  edgeRel: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 11 },
  edgeTarget: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },
  edgeWeight: { color: SAC.muted, fontSize: 10 }
});
