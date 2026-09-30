import { vi } from 'vitest';

const sentEmails: Array<{ to: string; subject: string; html: string }> = [];

const mockTransport = {
  sendMail: vi.fn(async (options: { to: string; subject: string; html: string; text?: string }) => {
    sentEmails.push({ to: options.to, subject: options.subject, html: options.html });
    return { messageId: 'mock-message-id' };
  }),
  verify: vi.fn().mockResolvedValue(true),
  close: vi.fn(),
};

const createTransport = vi.fn(() => mockTransport);

const mockNodemailer = { 
  sentEmails, 
  clear: () => { sentEmails.length = 0; },
  transport: mockTransport,
  createTransport,
 };

export default { createTransport };
export { createTransport, mockNodemailer };