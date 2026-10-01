import { mockPrisma } from '../mocks/prisma-client';

let userCounter = 0;
let roomCounter = 0;
let messageCounter = 0;

export function createTestUser(overrides: Partial<{
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
}> = {}) {
  const id = overrides.id || `user-${++userCounter}`;
  const user = {
    id,
    username: overrides.username || `user${userCounter}`,
    email: overrides.email || `user${userCounter}@test.com`,
    passwordHash: overrides.passwordHash || 'hashedpassword',
    emailVerified: overrides.emailVerified ?? false,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
    pendingEmail: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roomMemberships: [],
    messages: [],
  };
  
  mockPrisma.user.findUnique.mockResolvedValueOnce(user);
  mockPrisma.user.findFirst.mockResolvedValueOnce(user);
  return user;
}

export function createTestRoom(overrides: Partial<{
  id: string;
  type: 'GROUP' | 'DIRECT';
  name: string | null;
  directKey: string | null;
}> = {}) {
  const id = overrides.id || `room-${++roomCounter}`;
  const room = {
    id,
    type: overrides.type || 'GROUP',
    name: overrides.name ?? `Room ${roomCounter}`,
    directKey: overrides.directKey ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    messages: [],
  };
  
  mockPrisma.room.findUnique.mockResolvedValueOnce(room);
  mockPrisma.room.findFirst.mockResolvedValueOnce(room);
  return room;
}

export function createTestDirectRoom(
  user1: ReturnType<typeof createTestUser>,
  user2: ReturnType<typeof createTestUser>
) {
  const directKey = [user1.id, user2.id].sort().join('_');
  const room = createTestRoom({
    type: 'DIRECT',
    name: null,
    directKey,
  });
  
  const memberships = [
    { id: `member-${roomCounter * 2 - 1}`, roomId: room.id, userId: user1.id, role: 'OWNER', joinedAt: new Date(), room, user: user1 },
    { id: `member-${roomCounter * 2}`, roomId: room.id, userId: user2.id, role: 'MEMBER', joinedAt: new Date(), room, user: user2 },
  ];
  
  mockPrisma.roomMember.findMany.mockResolvedValueOnce(memberships);
  mockPrisma.room.findUnique.mockImplementation(async ({ where }: { where: { directKey?: string; id?: string } }) => {
    if (where.directKey === directKey) return room;
    if (where.id === room.id) return room;
    return null;
  });
  
  return room;
}

export function createTestMessage(overrides: Partial<{
  id: string;
  roomId: string;
  senderId: string;
  content: string;
}> = {}) {
  const id = overrides.id || `msg-${++messageCounter}`;
  const message = {
    id,
    roomId: overrides.roomId || 'room-1',
    senderId: overrides.senderId || 'user-1',
    content: overrides.content || 'Test message',
    createdAt: new Date(),
    editedAt: null,
    room: null,
    sender: null,
  };
  
  mockPrisma.message.findUnique.mockResolvedValueOnce(message);
  return message;
}

export function clearTestCounters() {
  userCounter = 0;
  roomCounter = 0;
  messageCounter = 0;
}