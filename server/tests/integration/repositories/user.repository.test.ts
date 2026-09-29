import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userRepository } from '@/repositories/user.repository';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { createTestUser } from '@/../tests/utils/factories';

describe('UserRepository Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createUser persists user flow', async () => {
    const input = { username: 'intuser', email: 'int@test.com', passwordHash: 'hash123' };
    const user = createTestUser({ ...input, id: 'user-1' });
    mockPrisma.user.create.mockResolvedValue(user);

    const created = await userRepository.createUser(input);

    expect(created.id).toBe('user-1');
    expect(created.username).toBe('intuser');
    expect(created.email).toBe('int@test.com');
  });

  it('getUserById retrieves created user', async () => {
    const user = createTestUser({ id: 'user-1', username: 'finder' });
    mockPrisma.user.findUnique.mockResolvedValue(user);

    const found = await userRepository.getUserById('user-1');

    expect(found?.username).toBe('finder');
  });

  it('updateUser reflects changes', async () => {
    const updated = createTestUser({ id: 'user-1', username: 'updated' });
    mockPrisma.user.update.mockResolvedValue(updated);

    const result = await userRepository.updateUser('user-1', { username: 'updated' });

    expect(result.username).toBe('updated');
  });

  it('deleteUser removes user', async () => {
    const user = createTestUser({ id: 'user-1' });
    mockPrisma.user.delete.mockResolvedValue(user);

    const result = await userRepository.deleteUser('user-1');

    expect(result.id).toBe('user-1');
  });
});