import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
      '@root': join(__dirname),
      '@@': join(__dirname, 'src', '.umi'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Exclude Umi integration tests that depend on @umijs/max test infrastructure
    // These require Umi's Jest runner and cannot be used with Vitest directly
    exclude: ['node_modules', 'dist', '.umi'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/.umi/**',
        'src/services/ant-design-pro/**',
        'src/**/*.d.ts',
        'src/**/index.style.ts',
      ],
      // Gates per docs/spec/v1-test-baseline.md §2: core/ (lines 80 /
      // branches 70) and widgets/ pure functions (lines 85). Deliberately NO
      // global thresholds — glob keys only gate their own files, so the
      // component/page layer stays ungated (v8 provider, vitest >=2.2 shape).
      thresholds: {
        'src/core/**': {
          lines: 80,
          branches: 70,
        },
        'src/components/widgets/**': {
          lines: 85,
        },
      },
    },
    passWithNoTests: true,
    testTimeout: 15000,
  },
});
