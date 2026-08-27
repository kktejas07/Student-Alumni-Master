import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SecurityPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/policy/privacy');
  }, [router]);
  return null;
}
