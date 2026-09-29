import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, AppError } from '@/middleware/error.middleware';

const mockRequest = () => ({});
const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles AppError with correct status and code', () => {
    const req = mockRequest();
    const res = mockResponse();
    const err = new AppError(409, 'CONFLICT', 'Username already in use');
    
    errorHandler(err, res);
    
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'CONFLICT', message: 'Username already in use' });
  });

  it('handles unknown error as 500', () => {
    const req = mockRequest();
    const res = mockResponse();
    const err = new Error('Something went wrong');
    
    errorHandler(err, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'internal_error', message: 'Something went wrong' });
  });

  it('handles AppError with 401', () => {
    const req = mockRequest();
    const res = mockResponse();
    const err = new AppError(401, 'UNAUTHORIZED', 'Invalid credentials');
    
    errorHandler(err, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED', message: 'Invalid credentials' });
  });

  it('handles AppError with 404', () => {
    const req = mockRequest();
    const res = mockResponse();
    const err = new AppError(404, 'NOT_FOUND', 'Resource not found');
    
    errorHandler(err, res);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'NOT_FOUND', message: 'Resource not found' });
  });
});