/**
 * Super Admin → Catalog Management page.
 *
 * Admin CRUD for:
 *  - Deals (student discounts, brand partnerships)
 *  - Insurance (medical, bike, loan plans)
 *  - Housing (student accommodation by country)
 *
 * Wired to /api/admin/catalog/* endpoints.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import {
  Plus, Trash2, RefreshCw, Search, X, ExternalLink,
  Percent, Shield, Home,
} from 'lucide-react-native';
import { SAC, useSAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, StatusPill,
  KpiTile, EmptyState, useToast, Toast,
} from '../applekit';
import { request } from '@/src/models/services/api';

/* ─── Shared helpers ──────────────────────────────────────────── */
const Field = ({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ color: SAC.muted, fontSize: 11, marginBottom: 4, fontFamily: FONTS.bold, letterSpacing: 0.3 }}>{label}</Text>
    <TextInput
      style={[{
        backgroundColor: SAC.cardSolid,
        color: SAC.text,
        borderWidth: 1,
        borderColor: SAC.border,
        borderRadius: 9,
        padding: 10,
        fontSize: 13,
        fontFamily: FONTS.regular,
      }, props.style]}
      placeholderTextColor={SAC.dim}
      {...props}
    />
  </View>
);

type CatalogTab = 'deals' | 'insurance' | 'housing';

const TABS: { id: CatalogTab; label: string; Icon: React.ComponentType<any> }[] = [
  { id: 'deals', label: 'Deals', Icon: Percent },
  { id: 'insurance', label: 'Insurance', Icon: Shield },
  { id: 'housing', label: 'Housing', Icon: Home },
];

/* ─── Deals sub-view ─────────────────────────────────────────── */
function DealsPanel({ T }: { T: ReturnType<typeof useSAC> }) {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, flash, hide } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [discount, setDiscount] = useState('');
  const [code, setCode] = useState('');
  const [expires, setExpires] = useState('Ongoing');
  const [url, setUrl] = useState('');

  const fetchDeals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await request<any>('/admin/catalog/deals');
      setDeals(res?.deals || []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const handleCreate = async () => {
    if (!title || !brand || !category || !discount) { flash('Fill required fields', 'error'); return; }
    try {
      await request<any>('/admin/catalog/deals', { method: 'POST', body: JSON.stringify({ title, brand, category, discount, code, expires, url }) });
      flash('Deal created', 'success');
      resetForm();
      fetchDeals(true);
    } catch { flash('Failed to create deal', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await request<any>(`/admin/catalog/deals/${id}`, { method: 'DELETE' });
      flash('Deal deleted', 'success');
      fetchDeals(true);
    } catch { flash('Failed to delete deal', 'error'); }
  };

  const resetForm = () => {
    setTitle(''); setBrand(''); setCategory(''); setDiscount('');
    setCode(''); setExpires('Ongoing'); setUrl(''); setShowForm(false);
  };

  const filtered = deals.filter(d =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.brand?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={{ gap: 16 }}>
      {/* KPI row */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile label="Total Deals" value={String(deals.length)} />
        <KpiTile label="Categories" value={String(new Set(deals.map(d => d.category)).size)} />
        <KpiTile label="Active Codes" value={String(deals.filter(d => d.code).length)} />
      </View>

      {/* Actions bar */}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 200, backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 10 }}>
          <Search size={14} color={SAC.dim} />
          <TextInput
            style={{ flex: 1, color: SAC.text, fontSize: 13, fontFamily: FONTS.regular, padding: 8 }}
            placeholder="Search deals…" placeholderTextColor={SAC.dim}
            value={search} onChangeText={setSearch}
          />
          {search ? <Pressable onPress={() => setSearch('')}><X size={14} color={SAC.dim} /></Pressable> : null}
        </View>
        <GradientButton label="Add Deal" Icon={Plus} onPress={() => setShowForm(!showForm)} />
        <SecondaryButton label="Refresh" Icon={RefreshCw} onPress={() => fetchDeals()} />
      </View>

      {/* Create form */}
      {showForm && (
        <Card>
          <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14, marginBottom: 12 }}>New Deal</Text>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. 20% Off Netflix" /></View>
              <View style={{ flex: 1 }}><Field label="Brand *" value={brand} onChangeText={setBrand} placeholder="e.g. Netflix" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Category *" value={category} onChangeText={setCategory} placeholder="e.g. Entertainment" /></View>
              <View style={{ flex: 1 }}><Field label="Discount *" value={discount} onChangeText={setDiscount} placeholder="e.g. 20%" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Code" value={code} onChangeText={setCode} placeholder="e.g. STUDENT20" /></View>
              <View style={{ flex: 1 }}><Field label="Expires" value={expires} onChangeText={setExpires} placeholder="Ongoing" /></View>
            </View>
            <Field label="URL" value={url} onChangeText={setUrl} placeholder="https://..." />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <GradientButton label="Create Deal" onPress={handleCreate} />
              <SecondaryButton label="Cancel" onPress={resetForm} />
            </View>
          </View>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={GRAD.from} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Percent} title="No deals yet" subtitle="Add your first student deal to get started." />
      ) : (
        <View style={{ gap: 8 }}>
          {filtered.map((deal) => (
            <Card key={deal.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 }}>{deal.title}</Text>
                    <StatusPill label={deal.category} kind="info" />
                  </View>
                  <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.regular }}>
                    {deal.brand} · {deal.discount}{deal.code ? ` · Code: ${deal.code}` : ''} · {deal.expires || 'Ongoing'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {deal.url ? (
                    <Pressable onPress={() => Platform.OS === 'web' && window.open(deal.url, '_blank')} style={{ padding: 6 }}>
                      <ExternalLink size={15} color={SAC.dim} />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => handleDelete(deal.id)} style={{ padding: 6 }}>
                    <Trash2 size={15} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
      <Toast {...toast} onDismiss={hide} />
    </View>
  );
}

/* ─── Insurance sub-view ─────────────────────────────────────── */
function InsurancePanel({ T }: { T: ReturnType<typeof useSAC> }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, flash, hide } = useToast();

  const [kind, setKind] = useState('');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [highlight, setHighlight] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await request<any>('/admin/catalog/insurance');
      setItems(res?.items || []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async () => {
    if (!kind || !title || !provider || !highlight) { flash('Fill required fields', 'error'); return; }
    try {
      await request<any>('/admin/catalog/insurance', { method: 'POST', body: JSON.stringify({ kind, title, provider, highlight, url, description }) });
      flash('Insurance plan added', 'success');
      resetForm();
      fetchItems(true);
    } catch { flash('Failed to create', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await request<any>(`/admin/catalog/insurance/${id}`, { method: 'DELETE' });
      flash('Deleted', 'success');
      fetchItems(true);
    } catch { flash('Failed to delete', 'error'); }
  };

  const resetForm = () => {
    setKind(''); setTitle(''); setProvider(''); setHighlight('');
    setUrl(''); setDescription(''); setShowForm(false);
  };

  const filtered = items.filter(i =>
    !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.provider?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile label="Total Plans" value={String(items.length)} />
        <KpiTile label="Kinds" value={String(new Set(items.map(i => i.kind)).size)} />
        <KpiTile label="Providers" value={String(new Set(items.map(i => i.provider)).size)} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 200, backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 10 }}>
          <Search size={14} color={SAC.dim} />
          <TextInput
            style={{ flex: 1, color: SAC.text, fontSize: 13, fontFamily: FONTS.regular, padding: 8 }}
            placeholder="Search insurance…" placeholderTextColor={SAC.dim}
            value={search} onChangeText={setSearch}
          />
          {search ? <Pressable onPress={() => setSearch('')}><X size={14} color={SAC.dim} /></Pressable> : null}
        </View>
        <GradientButton label="Add Plan" Icon={Plus} onPress={() => setShowForm(!showForm)} />
        <SecondaryButton label="Refresh" Icon={RefreshCw} onPress={() => fetchItems()} />
      </View>

      {showForm && (
        <Card>
          <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14, marginBottom: 12 }}>New Insurance Plan</Text>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Kind *" value={kind} onChangeText={setKind} placeholder="medical / bike / loan / life / travel" /></View>
              <View style={{ flex: 1 }}><Field label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Student Health Shield" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Provider *" value={provider} onChangeText={setProvider} placeholder="e.g. ICICI Lombard" /></View>
              <View style={{ flex: 1 }}><Field label="Highlight *" value={highlight} onChangeText={setHighlight} placeholder="e.g. ₹5L cover, ₹500/month" /></View>
            </View>
            <Field label="URL" value={url} onChangeText={setUrl} placeholder="https://..." />
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="Optional details" multiline numberOfLines={2} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <GradientButton label="Create Plan" onPress={handleCreate} />
              <SecondaryButton label="Cancel" onPress={resetForm} />
            </View>
          </View>
        </Card>
      )}

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={GRAD.from} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No insurance plans" subtitle="Add student insurance plans from your partnered providers." />
      ) : (
        <View style={{ gap: 8 }}>
          {filtered.map((item) => (
            <Card key={item.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 }}>{item.title}</Text>
                    <StatusPill label={item.kind} kind="info" />
                  </View>
                  <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.regular }}>
                    {item.provider} · {item.highlight}
                  </Text>
                  {item.description ? <Text style={{ color: SAC.dim, fontSize: 11, fontFamily: FONTS.regular }}>{item.description}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {item.url ? (
                    <Pressable onPress={() => Platform.OS === 'web' && window.open(item.url, '_blank')} style={{ padding: 6 }}>
                      <ExternalLink size={15} color={SAC.dim} />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => handleDelete(item.id)} style={{ padding: 6 }}>
                    <Trash2 size={15} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
      <Toast {...toast} onDismiss={hide} />
    </View>
  );
}

/* ─── Housing sub-view ───────────────────────────────────────── */
function HousingPanel({ T }: { T: ReturnType<typeof useSAC> }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, flash, hide } = useToast();

  const [country, setCountry] = useState('');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [highlight, setHighlight] = useState('');
  const [url, setUrl] = useState('');
  const [cities, setCities] = useState('');
  const [description, setDescription] = useState('');

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await request<any>('/admin/catalog/housing');
      setItems(res?.items || []);
    } catch { /* empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async () => {
    if (!country || !title || !provider || !highlight) { flash('Fill required fields', 'error'); return; }
    try {
      await request<any>('/admin/catalog/housing', {
        method: 'POST',
        body: JSON.stringify({
          country, title, provider, highlight, url, description,
          cities: cities.split(',').map(c => c.trim()).filter(Boolean),
        }),
      });
      flash('Housing added', 'success');
      resetForm();
      fetchItems(true);
    } catch { flash('Failed to create', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await request<any>(`/admin/catalog/housing/${id}`, { method: 'DELETE' });
      flash('Deleted', 'success');
      fetchItems(true);
    } catch { flash('Failed to delete', 'error'); }
  };

  const resetForm = () => {
    setCountry(''); setTitle(''); setProvider(''); setHighlight('');
    setUrl(''); setCities(''); setDescription(''); setShowForm(false);
  };

  const filtered = items.filter(i =>
    !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.country?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile label="Total Listings" value={String(items.length)} />
        <KpiTile label="Countries" value={String(new Set(items.map(i => i.country)).size)} />
        <KpiTile label="Providers" value={String(new Set(items.map(i => i.provider)).size)} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 200, backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 10 }}>
          <Search size={14} color={SAC.dim} />
          <TextInput
            style={{ flex: 1, color: SAC.text, fontSize: 13, fontFamily: FONTS.regular, padding: 8 }}
            placeholder="Search housing…" placeholderTextColor={SAC.dim}
            value={search} onChangeText={setSearch}
          />
          {search ? <Pressable onPress={() => setSearch('')}><X size={14} color={SAC.dim} /></Pressable> : null}
        </View>
        <GradientButton label="Add Listing" Icon={Plus} onPress={() => setShowForm(!showForm)} />
        <SecondaryButton label="Refresh" Icon={RefreshCw} onPress={() => fetchItems()} />
      </View>

      {showForm && (
        <Card>
          <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14, marginBottom: 12 }}>New Housing Listing</Text>
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Country *" value={country} onChangeText={setCountry} placeholder="e.g. India" /></View>
              <View style={{ flex: 1 }}><Field label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Student PG near SNIST" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Provider *" value={provider} onChangeText={setProvider} placeholder="e.g. Zolo Stays" /></View>
              <View style={{ flex: 1 }}><Field label="Highlight *" value={highlight} onChangeText={setHighlight} placeholder="e.g. From ₹8K/month" /></View>
            </View>
            <Field label="Cities (comma-separated)" value={cities} onChangeText={setCities} placeholder="e.g. Hyderabad, Bangalore, Chennai" />
            <Field label="URL" value={url} onChangeText={setUrl} placeholder="https://..." />
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="Optional details" multiline numberOfLines={2} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <GradientButton label="Create Listing" onPress={handleCreate} />
              <SecondaryButton label="Cancel" onPress={resetForm} />
            </View>
          </View>
        </Card>
      )}

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={GRAD.from} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Home} title="No housing listings" subtitle="Add student accommodation options by country." />
      ) : (
        <View style={{ gap: 8 }}>
          {filtered.map((item) => (
            <Card key={item.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 }}>{item.title}</Text>
                    <StatusPill label={item.country} kind="info" />
                  </View>
                  <Text style={{ color: SAC.muted, fontSize: 12, fontFamily: FONTS.regular }}>
                    {item.provider} · {item.highlight}
                    {item.cities?.length ? ` · ${item.cities.join(', ')}` : ''}
                  </Text>
                  {item.description ? <Text style={{ color: SAC.dim, fontSize: 11, fontFamily: FONTS.regular }}>{item.description}</Text> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {item.url ? (
                    <Pressable onPress={() => Platform.OS === 'web' && window.open(item.url, '_blank')} style={{ padding: 6 }}>
                      <ExternalLink size={15} color={SAC.dim} />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => handleDelete(item.id)} style={{ padding: 6 }}>
                    <Trash2 size={15} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
      <Toast {...toast} onDismiss={hide} />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Main Catalog View — tabbed container
 * ═══════════════════════════════════════════════════════════════ */
export function CatalogView() {
  const T = useSAC();
  const [activeTab, setActiveTab] = useState<CatalogTab>('deals');

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 80, maxWidth: 1100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: T.text, fontFamily: FONTS.bold, fontSize: 22 }}>Catalog Management</Text>
        <Text style={{ color: T.muted, fontFamily: FONTS.regular, fontSize: 13, marginTop: 4 }}>
          Manage deals, insurance plans, and housing listings for students.
        </Text>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', gap: 0, marginBottom: 20, borderBottomWidth: 1, borderColor: T.border }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <Pressable
              key={id}
              onPress={() => setActiveTab(id)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 16, paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: active ? GRAD.from : 'transparent',
              }}
            >
              <Icon size={15} color={active ? GRAD.from : T.dim} />
              <Text style={{
                color: active ? T.text : T.dim,
                fontFamily: active ? FONTS.bold : FONTS.regular,
                fontSize: 13,
              }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active panel */}
      {activeTab === 'deals' && <DealsPanel T={T} />}
      {activeTab === 'insurance' && <InsurancePanel T={T} />}
      {activeTab === 'housing' && <HousingPanel T={T} />}
    </ScrollView>
  );
}
