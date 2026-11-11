import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'app/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules',
      '.expo',
      // Tests that use @testing-library/react-native require jest + react-native
      // transform. Exclude them from vitest (they'll run under jest if needed).
      'app/__tests__/dealsCard.test.tsx',
      'src/features/settings/__tests__/settingsChangelog.test.tsx',
      'src/views/web/portals/superadmin/views/__tests__/AnalyticsPeriod.test.tsx',
      'src/views/web/__tests__/exploreData.test.tsx',
    ],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
