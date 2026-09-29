import { vi } from 'vitest';

const store = new Map<string, string>();
const zsets = new Map<string, Map<string, number>>();
const pubsub = {
  channels: new Map<string, Set<Function>>(),
  subscribe: vi.fn((channel: string) => pubsub.channels.set(channel, new Set())),
  unsubscribe: vi.fn((channel: string) => pubsub.channels.delete(channel)),
  publish: vi.fn((channel: string, message: string) => {
    const subs = pubsub.channels.get(channel);
    if (subs) subs.forEach(fn => fn(message));
  }),
};

const createMockClient = () => ({
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  set: vi.fn(async (key: string, value: string, opts?: { EX?: number }) => {
    store.set(key, value);
    if (opts?.EX) setTimeout(() => store.delete(key), opts.EX * 1000);
    return 'OK';
  }),
  del: vi.fn(async (...keys: string[]) => {
    let count = 0;
    keys.forEach(k => { if (store.delete(k)) count++; });
    return count;
  }),
  incr: vi.fn(async (key: string) => {
    const val = (parseInt(store.get(key) || '0', 10) + 1).toString();
    store.set(key, val);
    return val;
  }),
  decr: vi.fn(async (key: string) => {
    const val = (parseInt(store.get(key) || '0', 10) - 1).toString();
    store.set(key, val);
    return val;
  }),
  zAdd: vi.fn(async (key: string, members: { score: number; value: string }[]) => {
    const zs = zsets.get(key) ?? new Map();
    members.forEach(m => zs.set(m.value, m.score));
    zsets.set(key, zs);
    return members.length;
  }),
  zRem: vi.fn(async (key: string, ...values: string[]) => {
    const zs = zsets.get(key);
    if (!zs) return 0;
    let count = 0;
    values.forEach(v => { if (zs.delete(v)) count++; });
    return count;
  }),
  zScore: vi.fn(async (key: string, value: string) => zsets.get(key)?.get(value) ?? null),
  zRange: vi.fn(async (key: string, min: number, max: number) => {
    const zs = zsets.get(key);
    if (!zs) return [];
    return Array.from(zs.entries())
      .filter(([, score]) => score >= min && score <= max)
      .map(([value]) => value);
  }),
  getDel: vi.fn(async (key: string) => {
    const val = store.get(key) ?? null;
    store.delete(key);
    return val;
  }),
  duplicate: vi.fn(() => createMockClient()),
  subscribe: vi.fn(async (channel: string) => {
    pubsub.channels.set(channel, new Set());
  }),
  unsubscribe: vi.fn(async (channel: string) => {
    pubsub.channels.delete(channel);
  }),
  pSubscribe: vi.fn(),
  pUnsubscribe: vi.fn(),
  on: vi.fn(),
});

export const createClient = vi.fn(createMockClient);

export const redisClient = createMockClient();
export const mockRedisStore = store;
export const mockRedisZSets = zsets;