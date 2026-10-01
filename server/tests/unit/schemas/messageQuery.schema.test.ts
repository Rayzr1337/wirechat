import { describe, it, expect } from 'vitest';
import { getMessagesQuerySchema } from '@/schemas/messageQuery.schema';

describe('Message Query Schemas Validation', () => {
  describe('getMessagesQuerySchema', () => {
    it('accepts empty query (all optional)', () => {
      const result = getMessagesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid limit', () => {
      const result = getMessagesQuerySchema.safeParse({ limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.limit).toBe(25);
    });

    it('accepts valid cursor', () => {
      const result = getMessagesQuerySchema.safeParse({ cursor: '11111111-1111-4111-8111-111111111111' });
      expect(result.success).toBe(true);
    });

    it('accepts both limit and cursor', () => {
      const result = getMessagesQuerySchema.safeParse({
        limit: '10',
        cursor: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-numeric limit', () => {
      const result = getMessagesQuerySchema.safeParse({ limit: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('rejects limit below 1', () => {
      const result = getMessagesQuerySchema.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
    });

    it('rejects limit above 100', () => {
      const result = getMessagesQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer limit', () => {
      const result = getMessagesQuerySchema.safeParse({ limit: '10.5' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid cursor format', () => {
      const result = getMessagesQuerySchema.safeParse({ cursor: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('coerces string limit to number', () => {
      const result = getMessagesQuerySchema.safeParse({ limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) expect(typeof result.data.limit).toBe('number');
    });
  });
});