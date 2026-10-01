import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: ['./tests/vitest-setup.ts', './tests/jest.unit.env.ts'],
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      coverageDirectory: 'coverage/unit',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/server.ts',
        'src/generated/**',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tests': resolve(__dirname, 'tests'),
      '@/generated/prisma/client': resolve(__dirname, 'tests/mocks/prisma-client.ts'),
      '../generated/prisma/client': resolve(__dirname, 'tests/mocks/prisma-client.ts'),
      '@prisma/client': resolve(__dirname, 'tests/mocks/prisma-client.ts'),
      'redis': resolve(__dirname, 'tests/mocks/redis.ts'),
      'nodemailer': resolve(__dirname, 'tests/mocks/nodemailer.ts'),
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@tests': resolve(__dirname, 'tests'),
        '@/generated/prisma/client': resolve(__dirname, 'tests/mocks/prisma-client.ts'),
        '../generated/prisma/client': resolve(__dirname, 'tests/mocks/prisma-client.ts'),
        '@prisma/client': resolve(__dirname, 'tests/mocks/prisma-client.ts'),
        'redis': resolve(__dirname, 'tests/mocks/redis.ts'),
        'nodemailer': resolve(__dirname, 'tests/mocks/nodemailer.ts'),
      },
    },
  },
});