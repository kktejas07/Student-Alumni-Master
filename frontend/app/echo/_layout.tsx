import { Stack } from 'expo-router';

export default function EchoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}
