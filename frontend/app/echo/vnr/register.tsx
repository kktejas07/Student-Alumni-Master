// @ts-nocheck
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function EchoVnrRegisterRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/echo/vnr-echo-2026/register');
  }, [router]);

  return null;
}
