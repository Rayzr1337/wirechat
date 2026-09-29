import { vi } from 'vitest';

const mockPrismaClient = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  room: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  roomMember: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  message: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  $transaction: vi.fn(async (fn) => fn(mockPrismaClient)),
};

class MockPrismaClient {
  constructor() {
    Object.assign(this, mockPrismaClient);
  }
}

export const PrismaClient = MockPrismaClient;
export const Prisma = {
  UserCreateInput: vi.fn(),
  UserUpdateInput: vi.fn(),
  RoomCreateInput: vi.fn(),
  RoomUpdateInput: vi.fn(),
  MessageCreateInput: vi.fn(),
  MessageUpdateInput: vi.fn(),
  TransactionClient: vi.fn(),
};

export const mockPrisma = mockPrismaClient;