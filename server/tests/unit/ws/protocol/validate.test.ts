import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateIncomingMessage } from '@/ws/protocol/validate';
import { incomingMessageSchema } from '@/ws/protocol/schemas';

describe('validateIncomingMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valid messages', () => {
    it('validates JOIN_ROOM with valid UUID', () => {
      const message = {
        type: 'JOIN_ROOM',
        payload: { roomId: '11111111-1111-4111-8111-111111111111' },
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('JOIN_ROOM');
        expect(result.data.payload.roomId).toBe('11111111-1111-4111-8111-111111111111');
      }
    });

    it('validates LEAVE_ROOM with valid UUID', () => {
      const message = {
        type: 'LEAVE_ROOM',
        payload: { roomId: '22222222-2222-4222-8222-222222222222' },
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('LEAVE_ROOM');
      }
    });

    it('validates MESSAGE with roomId and content', () => {
      const message = {
        type: 'MESSAGE',
        payload: { 
          roomId: '33333333-3333-4333-8333-333333333333',
          content: 'Hello world',
        },
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('MESSAGE');
        expect(result.data.payload.content).toBe('Hello world');
      }
    });

    it('validates EDIT_MESSAGE with messageId and content', () => {
      const message = {
        type: 'EDIT_MESSAGE',
        payload: { 
          messageId: '44444444-4444-4444-8444-444444444444',
          content: 'Updated content',
        },
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('EDIT_MESSAGE');
      }
    });

    it('validates DELETE_MESSAGE with messageId', () => {
      const message = {
        type: 'DELETE_MESSAGE',
        payload: { 
          messageId: '55555555-5555-4555-8555-555555555555',
        },
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('DELETE_MESSAGE');
      }
    });

    it('validates TYPING with roomId', () => {
      const message = {
        type: 'TYPING',
        payload: { roomId: '66666666-6666-4666-8666-666666666666' },
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('TYPING');
      }
    });

    it('trims content and allows max 2000 chars', () => {
      const message = {
        type: 'MESSAGE',
        payload: { 
          roomId: '11111111-1111-4111-8111-111111111111',
          content: '  Hello  ',
        },
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.payload.content).toBe('Hello');
      }
    });
  });

  describe('invalid JSON', () => {
    it('returns INVALID_MESSAGE for malformed JSON', () => {
      const result = validateIncomingMessage('{ invalid json }');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
        expect(result.message).toBe('Invalid JSON format');
      }
    });

    it('returns INVALID_MESSAGE for empty string', () => {
      const result = validateIncomingMessage('');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for non-object JSON', () => {
      const result = validateIncomingMessage('"just a string"');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });
  });

  describe('invalid schema', () => {
    it('returns INVALID_MESSAGE for missing type', () => {
      const message = { payload: { roomId: '11111111-1111-4111-8111-111111111111' } };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for unknown type', () => {
      const message = { type: 'UNKNOWN', payload: {} };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for JOIN_ROOM missing roomId', () => {
      const message = { type: 'JOIN_ROOM', payload: {} };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for JOIN_ROOM with invalid UUID', () => {
      const message = { type: 'JOIN_ROOM', payload: { roomId: 'not-a-uuid' } };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for MESSAGE with empty content', () => {
      const message = { 
        type: 'MESSAGE', 
        payload: { roomId: '11111111-1111-4111-8111-111111111111', content: '' } 
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for MESSAGE with content over 2000 chars', () => {
      const message = { 
        type: 'MESSAGE', 
        payload: { roomId: '11111111-1111-4111-8111-111111111111', content: 'a'.repeat(2001) } 
      };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for EDIT_MESSAGE missing messageId', () => {
      const message = { type: 'EDIT_MESSAGE', payload: { content: 'test' } };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for DELETE_MESSAGE missing messageId', () => {
      const message = { type: 'DELETE_MESSAGE', payload: {} };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });

    it('returns INVALID_MESSAGE for TYPING missing roomId', () => {
      const message = { type: 'TYPING', payload: {} };
      const result = validateIncomingMessage(JSON.stringify(message));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_MESSAGE');
      }
    });
  });
});