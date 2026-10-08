import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only — the Playwright smoke lives in tests/e2e and runs via
    // `bun run test:e2e`.
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
