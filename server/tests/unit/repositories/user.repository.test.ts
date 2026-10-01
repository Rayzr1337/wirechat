import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userRepository } from '@/repositories/user.repository';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { createTestUser } from '@/../tests/utils/factories';

describe('user.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createUser calls prisma.user.create with data', async () => {
    const user = createTestUser({ id: 'user-1', username: 'testuser', email: 'test@test.com' });
    mockPrisma.user.create.mockResolvedValue(user);

    const result = await userRepository.createUser({ username: 'testuser', email: 'test@test.com', passwordHash: 'hash' });

    expect(result).toEqual(user);
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { username: 'testuser', email: 'test@test.com', passwordHash: 'hash' },
    });
  });

  it('getUserById returns user', async () => {
    const user = createTestUser({ id: 'user-1' });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await userRepository.getUserById('user-1');

    expect(result).toEqual(user);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('getUserByUsername returns user', async () => {
    const user = createTestUser({ username: 'testuser' });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await userRepository.getUserByUsername('testuser');

    expect(result).toEqual(user);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'testuser' } });
  });

  it('getUserByEmail returns user', async () => {
    const user = createTestUser({ email: 'test@test.com' });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const result = await userRepository.getUserByEmail('test@test.com');

    expect(result).toEqual(user);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
  });

  it('updateUser updates user data', async () => {
    const user = createTestUser({ username: 'updated' });
    mockPrisma.user.update.mockResolvedValue(user);

    const result = await userRepository.updateUser('user-1', { username: 'updated' });

    expect(result).toEqual(user);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { username: 'updated' },
    });
  });

  it('deleteUser deletes user', async () => {
    const user = createTestUser({ id: 'user-1' });
    mockPrisma.user.delete.mockResolvedValue(user);

    const result = await userRepository.deleteUser('user-1');

    expect(result).toEqual(user);
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });
});