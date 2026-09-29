import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUser } from '@/middleware/auth.middleware';
import { AppError } from '@/middleware/error.middleware';
import jwt from 'jsonwebtoken';

const mockRequest = (cookie?: string) => ({
  cookies: { token: cookie },
  user: undefined,
});

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('isUser (auth middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNext.mockClear();
  });

  it('sets req.user for valid JWT', () => {
    const req = mockRequest('token=valid-token');
    const res = mockResponse();
    
    const token = jwt.sign({ userId: 'user-123' }, 'test-secret-key-for-testing-only', { expiresIn: '7d' });
    req.cookies.token = token;
    
    isUser(req, res, mockNext);
    
    expect(req.user).toEqual({ userId: 'user-123' });
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with AppError for missing token', () => {
    const req = mockRequest();
    const res = mockResponse();
    
    isUser(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('calls next with AppError for invalid token', () => {
    const req = mockRequest('token=invalid-token');
    const res = mockResponse();
    
    isUser(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('calls next with AppError for expired token', () => {
    const req = mockRequest('token=expired-token');
    const res = mockResponse();
    
    const token = jwt.sign({ userId: 'user-123' }, 'test-secret-key-for-testing-only', { expiresIn: '-1s' });
    req.cookies.token = token;
    
    isUser(req, res, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    const error = mockNext.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });
});