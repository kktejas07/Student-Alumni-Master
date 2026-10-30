/**
 * Shared catalog-item form pieces used by the Super Admin
 * CatalogOrdersManager and the vendor-portal VendorCatalogView.
 *
 * Both screens edit the same item shape (name, price, category, stock,
 * stall, servings, description, availability). Each row below takes the
 * in-progress `item` and an `onChange(patch)` so the parent keeps ownership
 * of its editing state and can interleave its own role-specific rows
 * (vendor assignment, image upload) wherever it needs them.
 */
import React from 'react';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import { SAC, FONTS } from '../superadmin/tokens';

/* ─────────────────────────────────────────────────────────────────
 * Primitives
 * ───────────────────────────────────────────────────────────────── */
export const Field = (props: any) => (
  <TextInput
    style={[{
      backgroundColor: SAC.bg,
      color: SAC.text,
      borderWidth: 1,
      borderColor: SAC.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      fontFamily: FONTS.regular,
    }, props.style]}
    placeholderTextColor={SAC.muted}
    {...props}
  />
);

export const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
  <Pressable
    onPress={() => onChange(!value)}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
  >
    <View
      style={[{
        width: 40, height: 22, borderRadius: 11, padding: 2,
        backgroundColor: value ? '#10B981' : 'rgba(255,255,255,0.12)',
        justifyContent: value ? 'flex-end' : 'flex-start',
      }]}
    >
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
    </View>
    <Text style={{ color: SAC.text, fontFamily: FONTS.med, fontSize: 13 }}>{label}</Text>
  </Pressable>
);

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const FormLabel = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ color: SAC.muted, fontSize: 12, marginBottom: 4 }}>{children}</Text>
);

/** Shared inline style for native `<select>` on web, matching `Field`. */
export const WEB_SELECT_STYLE: React.CSSProperties = {
  backgroundColor: SAC.bg, color: SAC.text, borderWidth: 1,
  borderColor: SAC.border, borderRadius: 8, padding: 10, fontSize: 14,
  fontFamily: FONTS.regular, width: '100%', outline: 'none',
};

export const CATALOG_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'food', label: 'Food' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'cafe', label: 'Cafe / Coffee' },
  { value: 'handcraft', label: 'Handcraft' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'apparel', label: 'Apparel / Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'other', label: 'Other' },
];

export function CategorySelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  if (Platform.OS === 'web') {
    return (
      <select
        value={value || 'food'}
        onChange={(e) => onChange(e.target.value)}
        style={WEB_SELECT_STYLE}
      >
        {CATALOG_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    );
  }
  return <Field value={value || ''} onChangeText={onChange} placeholder="Select category" />;
}

/* ─────────────────────────────────────────────────────────────────
 * Form rows
 * ───────────────────────────────────────────────────────────────── */
type RowProps = { item: any; onChange: (patch: Record<string, any>) => void };

export const Row = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>
);

export const Col = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flex: 1 }}>{children}</View>
);

export function NamePriceRow({ item, onChange, priceLabel = 'Price', numericPrice = false }: RowProps & {
  priceLabel?: string; numericPrice?: boolean;
}) {
  return (
    <Row>
      <Col>
        <FormLabel>Name</FormLabel>
        <Field value={item.name || ''} onChangeText={(v: string) => onChange({ name: v })} placeholder="e.g. Handmade Mug" />
      </Col>
      <Col>
        <FormLabel>{priceLabel}</FormLabel>
        <Field
          value={String(item.price || '')}
          onChangeText={(v: string) => onChange({ price: Number(v) })}
          placeholder="0"
          {...(numericPrice ? { keyboardType: 'numeric' } : {})}
        />
      </Col>
    </Row>
  );
}

export function CategoryStockRow({ item, onChange, stockValue, numericStock = false }: RowProps & {
  /** Display value for the stock field (callers differ in fallback rules). */
  stockValue: string; numericStock?: boolean;
}) {
  return (
    <Row>
      <Col>
        <FormLabel>Category</FormLabel>
        <CategorySelect value={item.category} onChange={(v) => onChange({ category: v })} />
      </Col>
      <Col>
        <FormLabel>Stock Limit (0 = unlimited)</FormLabel>
        <Field
          value={stockValue}
          onChangeText={(v: string) => onChange({ stock_limit: Number(v) })}
          placeholder="0"
          {...(numericStock ? { keyboardType: 'numeric' } : {})}
        />
      </Col>
    </Row>
  );
}

export function StallRow({ item, onChange }: RowProps) {
  return (
    <Row>
      <Col>
        <FormLabel>Stall No.</FormLabel>
        <Field value={item.stall_no || ''} onChangeText={(v: string) => onChange({ stall_no: v })} placeholder="e.g. B-12" />
      </Col>
      <Col>
        <FormLabel>Stall Location</FormLabel>
        <Field value={item.stall_location || ''} onChangeText={(v: string) => onChange({ stall_location: v })} placeholder="e.g. Food Court, Block A" />
      </Col>
    </Row>
  );
}

export function ServingsField({ item, onChange }: RowProps) {
  return (
    <View>
      <FormLabel>Servings / Portion Info</FormLabel>
      <Field value={item.servings || ''} onChangeText={(v: string) => onChange({ servings: v })} placeholder="e.g. Serves 2-3, 500ml, 1 piece" />
    </View>
  );
}

export function DescriptionField({ item, onChange, placeholder = 'Description' }: RowProps & { placeholder?: string }) {
  return (
    <View>
      <FormLabel>Description</FormLabel>
      <Field value={item.description || ''} onChangeText={(v: string) => onChange({ description: v })} placeholder={placeholder} multiline />
    </View>
  );
}

export function AvailabilityToggle({ item, onChange }: RowProps) {
  return (
    <Toggle
      value={item.is_active !== false}
      onChange={(v) => onChange({ is_active: v })}
      label={item.is_active === false ? 'Unavailable (hidden from shoppers)' : 'Available for purchase'}
    />
  );
}

/** Container styling for the inline editor panel. */
export const EDITOR_PANEL_STYLE = {
  padding: 16, backgroundColor: SAC.panel, borderRadius: 12, borderWidth: 1,
  borderColor: SAC.border, marginBottom: 16, gap: 12,
} as const;

/** Section header: title with count plus a right-side action. */
export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: SAC.text }}>{title}</Text>
      {right}
    </View>
  );
}
