import request from 'supertest';
import { Express } from 'express';
import { mockNodemailer } from '@/../tests/mocks/nodemailer';

export interface AuthCookie {
  name: string;
  value: string;
}

export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
  cookie: AuthCookie;
}

export async function registerUser(
  app: Express,
  username: string,
  email: string,
  password: string = 'password123'
): Promise<RegisteredUser> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, email, password })
    .expect(201);

  const cookie = res.headers['set-cookie']?.[0];
  if (!cookie) {
    throw new Error('No auth cookie set after registration');
  }

  const cookieParts = cookie.split(';')[0].split('=');
  return {
    id: res.body.id,
    username: res.body.username,
    email: res.body.email,
    cookie: { name: cookieParts[0], value: cookieParts[1] },
  };
}

export async function loginUser(
  app: Express,
  email: string,
  password: string = 'password123'
): Promise<AuthCookie> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  const cookie = res.headers['set-cookie']?.[0];
  if (!cookie) {
    throw new Error('No auth cookie set after login');
  }

  const cookieParts = cookie.split(';')[0].split('=');
  return { name: cookieParts[0], value: cookieParts[1] };
}

export function getCookieHeader(cookie: AuthCookie): string {
  return `${cookie.name}=${cookie.value}`;
}

export function getAuthAgent(app: Express, cookie: AuthCookie) {
  const agent = request.agent(app);
  agent.set('Cookie', getCookieHeader(cookie));
  return agent;
}

export async function getWsTicket(
  app: Express,
  cookie: AuthCookie
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/ws-ticket')
    .set('Cookie', getCookieHeader(cookie))
    .expect(200);

  return res.body.ticket;
}

export async function logoutUser(
  app: Express,
  cookie: AuthCookie
): Promise<void> {
  await request(app)
    .post('/api/auth/logout')
    .set('Cookie', getCookieHeader(cookie))
    .expect(200);
}

export async function verifyEmailToken(app: Express, token: string): Promise<void> {
  await request(app)
    .get('/api/auth/verify-email')
    .query({ token })
    .expect(200);
}

export async function resendVerification(
  app: Express,
  cookie: AuthCookie
): Promise<void> {
  await request(app)
    .post('/api/auth/resend-verification')
    .set('Cookie', getCookieHeader(cookie))
    .expect(200);
}

export function clearEmailMock(): void {
  mockNodemailer.clear();
}

export function getSentEmails(): Array<{ to: string; subject: string; html: string }> {
  return mockNodemailer.sentEmails;
}

export function assertErrorResponse(
  res: request.Response,
  expectedError: string,
  expectedStatusCode: number
): void {
  expect(res.status).toBe(expectedStatusCode);
  expect(res.body).toMatchObject({ error: expectedError });
}