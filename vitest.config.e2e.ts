import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node', // Use Node environment for e2e tests
    globals: true,
    setupFiles: ['./tests/e2e/setup/e2e-setup.ts'],
    include: [
      'tests/e2e/**/*.e2e.test.ts',
    ],
    exclude: ['node_modules', '.next', 'dist', 'build'],
    testTimeout: 30000, // 30 seconds for e2e tests
    hookTimeout: 30000,
    teardownTimeout: 30000,
    isolate: true,
    pool: 'threads',
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/app': path.resolve(__dirname, './src/app'),
    },
  },
});