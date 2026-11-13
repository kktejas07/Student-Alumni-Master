// @ts-nocheck
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EchoCampusEventPage() {
  const { slug, event } = useLocalSearchParams<{ slug?: string; event?: string }>();
  const canonicalSlug = event || slug;
  return <Redirect href={canonicalSlug ? `/echo/${canonicalSlug}` : '/echo'} />;
}
