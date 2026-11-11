import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'app/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.expo'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
