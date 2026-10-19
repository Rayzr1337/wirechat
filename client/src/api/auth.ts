import { request } from './client';

export interface Me {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    emailVerified: boolean;
    pendingEmail?: string;
}

type Session = Pick<Me, "id" | "username" | "email">;

export function login(email: string, password: string) {
    return request<Session>('/api/auth/login', { method: 'POST', body: { email, password } });
}

export function register(username: string, email: string, password: string) {
    return request<Session>('/api/auth/register', { 
        method: 'POST',
        body: { username, email, password },
    });
}

export function logout() {
    return request<{ message: string }>('/api/auth/logout', { method: 'POST' });
}

export function getMe() {
    return request<Me>('/api/users/me');
}

export function verifyEmail(token: string) {
    return request<{ message: string }>(
        `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
}

export function updateProfile(data: { username?: string; avatarUrl?: string }) {
    return request<{ id: string; username: string; avatarUrl: string | null }>('/api/users/me', {
        method: 'PATCH',
        body: data,
    });
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
    return request<{ message: string }>('/api/users/me/password', {
        method: 'PATCH',
        body: data,
    });
}

export function requestEmailChange(data: { newEmail: string }) {
    return request<{ message: string }>('/api/users/me/change-email', {
        method: 'POST',
        body: data,
    });
}
