import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-testing-only';

export function getAuthCookie(userId: string): string {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  return `token=${token}; HttpOnly; Secure; SameSite=Lax`;
}

export function getWsTicket(userId: string): string {
  return `ticket-${userId}-${Date.now()}`;
}

export function decodeToken(token: string) {
  return jwt.decode(token) as { userId: string } | null;
}