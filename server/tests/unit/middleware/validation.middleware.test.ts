import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate, validateQuery } from '@/middleware/validation.middleware';
import { z } from 'zod';
import { AppError } from '@/middleware/error.middleware';

const mockRequest = (body = {}, query = {}, params = {}) => ({
  body,
  query,
  params,
});

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

describe('validate (body validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNext.mockClear();
  });

  it('passes valid body', () => {
    const req = mockRequest({ username: 'testuser', email: 'test@test.com', password: 'password123' });
    const res = mockResponse();
    
    validate(userSchema)(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with AppError for invalid body', () => {
    const req = mockRequest({ username: 'ab', email: 'invalid', password: 'short' });
    const res = mockResponse();
    
    validate(userSchema)(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('validateQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNext.mockClear();
  });

  it('passes valid query', () => {
    const req = mockRequest({}, { limit: '10', cursor: 'abc123' });
    const res = mockResponse();
    
    validateQuery(z.object({ limit: z.string().optional(), cursor: z.string().optional() }))(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with AppError for invalid query', () => {
    const req = mockRequest({}, { limit: 'invalid' });
    const res = mockResponse();
    
    validateQuery(z.object({ limit: z.string().regex(/^\d+$/) }))(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});