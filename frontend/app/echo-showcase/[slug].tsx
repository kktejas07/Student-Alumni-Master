// @ts-nocheck
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyEchoShowcaseRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return <Redirect href={slug ? `/echo/${slug}` : '/echo'} />;
}
