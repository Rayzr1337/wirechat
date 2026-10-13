import { ErrorCode } from '../ws/protocol/schemas';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
    path: string,
    options: { method?: string; body?: unknown } = {} ): Promise<T> {
        const { method = 'GET', body } = options;
        const res = await fetch(path, {
            method,
            headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new ApiError(res.status, data?.error ?? "unknown_error",
        data?.message ?? res.statusText, data?.details);
    }

    return data as T;
}

