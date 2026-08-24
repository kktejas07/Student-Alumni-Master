import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import LegalShell from './LegalShell';
import HtmlRenderer from './HtmlRenderer';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { request } from '@/src/models/services/api';

interface PageData {
  key: string;
  title: string;
  route: string;
  content: string;
  updated_at: string;
}

export default function DynamicLegalPage({ pageKey }: { pageKey: string }) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await request<PageData>(`/pages/${pageKey}`);
        setPage(data);
      } catch {
        setError(true);
      }
      setLoading(false);
    })();
  }, [pageKey]);

  if (loading) {
    return (
      <LegalShell title="Loading...">
        <View style={s.loader}>
          <ActivityIndicator size="small" color="#F59E0B" />
        </View>
      </LegalShell>
    );
  }

  if (error || !page) {
    return (
      <LegalShell title="Page Not Found">
        <Text style={s.p}>This page could not be loaded. Please try again later.</Text>
      </LegalShell>
    );
  }

  return (
    <LegalShell title={page.title}>
      <HtmlRenderer html={page.content} />
    </LegalShell>
  );
}

const s = StyleSheet.create({
  loader: { paddingVertical: 60, alignItems: 'center' },
  p: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 22 },
});
