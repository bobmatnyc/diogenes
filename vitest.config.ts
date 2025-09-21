import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    exclude: ['node_modules', '.next', 'dist', 'cypress', 'build', 'tests/e2e/**'],
    // Default configuration for unit/integration tests
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '.next/',
        'coverage/',
        'public/',
        'dist/',
        '**/*.d.ts',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/*.test.{js,ts,jsx,tsx}',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 30000, // Increased for e2e tests
    hookTimeout: 30000,
    teardownTimeout: 30000,
    isolate: true,
    pool: 'threads',
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    css: {
      modules: {
        classNameStrategy: 'stable',
      },
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/app': path.resolve(__dirname, './src/app'),
    },
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
