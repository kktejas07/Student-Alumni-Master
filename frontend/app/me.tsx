import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MeRedirectPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const tab = params.tab;
    if (tab) {
      router.replace(`/student-portal?tab=profile&ptab=${tab}` as any);
    } else {
      router.replace('/student-portal?tab=profile' as any);
    }
  }, [params, router]);

  return null;
}
