import { vi } from 'vitest';
import { mockPrisma } from './mocks/prisma-client';
import { mockNodemailer } from './mocks/nodemailer';
import { mockRedisStore, mockRedisZSets, redisClient } from './mocks/redis';

beforeEach(() => {
  vi.clearAllMocks();
  
  if (mockNodemailer && typeof mockNodemailer.clear === 'function') {
    mockNodemailer.clear();
  }
  
  mockRedisStore.clear();
  mockRedisZSets.clear();
  
  // Reset Redis mock functions
  redisClient.mGet.mockClear();
  redisClient.zmScore.mockClear();
  redisClient.incr.mockClear();
  redisClient.decr.mockClear();
  redisClient.zAdd.mockClear();
  redisClient.zRem.mockClear();
  redisClient.get.mockClear();
  redisClient.set.mockClear();
  redisClient.del.mockClear();
  
  mockPrisma.user.create.mockReset();
  mockPrisma.user.findUnique.mockReset();
  mockPrisma.user.findMany.mockReset();
  mockPrisma.user.update.mockReset();
  mockPrisma.user.delete.mockReset();
  mockPrisma.user.findFirst.mockReset();
  
  mockPrisma.room.create.mockReset();
  mockPrisma.room.findUnique.mockReset();
  mockPrisma.room.findMany.mockReset();
  mockPrisma.room.update.mockReset();
  mockPrisma.room.delete.mockReset();
  mockPrisma.room.findFirst.mockReset();
  
  mockPrisma.roomMember.create.mockReset();
  mockPrisma.roomMember.findUnique.mockReset();
  mockPrisma.roomMember.findMany.mockReset();
  mockPrisma.roomMember.update.mockReset();
  mockPrisma.roomMember.delete.mockReset();
  mockPrisma.roomMember.findFirst.mockReset();
  
  mockPrisma.message.create.mockReset();
  mockPrisma.message.findUnique.mockReset();
  mockPrisma.message.findMany.mockReset();
  mockPrisma.message.update.mockReset();
  mockPrisma.message.delete.mockReset();
  mockPrisma.message.findFirst.mockReset();
  
  mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
});