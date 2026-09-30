import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockNodemailer } from '@/../tests/mocks/nodemailer';
import * as emailService from '@/services/email.service';

describe('email.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNodemailer.clear();
  });

  describe('sendVerificationMail', () => {
    it('sends verification email with correct options', async () => {
      const to = 'test@example.com';
      const username = 'testuser';
      const token = 'verification-token-123';

      await emailService.sendVerificationMail(to, username, token);

      expect(mockNodemailer.transport.sendMail).toHaveBeenCalledOnce();
      const mailOptions = mockNodemailer.transport.sendMail.mock.calls[0][0];
      
      expect(mailOptions.from).toBe(process.env.SMTP_FROM);
      expect(mailOptions.to).toBe(to);
      expect(mailOptions.subject).toBe('Verify your email address - wirechat');
      expect(mailOptions.text).toContain(`${process.env.APP_URL}/api/auth/verify-email?token=${token}`);
      expect(mailOptions.html).toContain(username);
      expect(mailOptions.html).toContain(`${process.env.APP_URL}/api/auth/verify-email?token=${token}`);
    });

    it('includes verification URL in HTML', async () => {
      const token = 'abc-123-def';
      
      await emailService.sendVerificationMail('test@example.com', 'user', token);

      const mailOptions = mockNodemailer.transport.sendMail.mock.calls[0][0];
      const expectedUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${token}`;
      
      expect(mailOptions.html).toContain(expectedUrl);
      expect(mailOptions.html).toContain('Verify Email');
    });

    it('includes username in HTML greeting', async () => {
      await emailService.sendVerificationMail('test@example.com', 'john_doe', 'token');

      const mailOptions = mockNodemailer.transport.sendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toContain('Hey john_doe!');
    });

    it('includes expiry notice in HTML', async () => {
      await emailService.sendVerificationMail('test@example.com', 'user', 'token');

      const mailOptions = mockNodemailer.transport.sendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toContain('expires in 24 hours');
    });

    it('stores sent email in mock', async () => {
      await emailService.sendVerificationMail('test@example.com', 'user', 'token');

      expect(mockNodemailer.sentEmails).toHaveLength(1);
      expect(mockNodemailer.sentEmails[0]).toMatchObject({
        to: 'test@example.com',
        subject: 'Verify your email address - wirechat',
      });
    });
  });
});