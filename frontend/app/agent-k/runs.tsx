/**
 * /agent-k/runs — Legacy route, redirected to /agent-k.
 *
 * As of v0.14.0 the Agent K UI is a single consolidated view at /agent-k
 * (prescription cards + collapsed run history). This route is kept only
 * to preserve any existing deep links / bookmarks.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function AgentKRunsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/agent-k');
  }, [router]);
  return <View />;
}
