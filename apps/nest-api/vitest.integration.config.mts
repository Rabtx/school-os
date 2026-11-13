import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Tests boot the full AppModule, so auth secrets must parse without a local .env.
    env: {
      JWT_SECRET: 'test-only-jwt-secret-0123456789abcdef',
      AUTH_TOKEN_SECRET: 'test-only-token-secret-0123456789abcdef',
    },
    include: ['test/**/*.integration-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
