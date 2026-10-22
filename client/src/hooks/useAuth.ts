import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from "react-router";
import {
  login,
  logout,
  register as registerUser,
  updateProfile,
  changePassword,
  requestEmailChange,
  resendVerification,
} from '../api/auth';
import { resetClientState } from '../lib/resetClientState'

export function useLogin() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: (p: { email: string, password: string }) => login(p.email, p.password),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
            navigate("/", { replace: true });
        },
    });
}

export function useRegister() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: (data: { username: string; email: string; password: string }) =>
            registerUser(data.username, data.email, data.password),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
            navigate("/", { replace: true });
        },
    });
}

export function useLogout() {
    return useMutation({
        mutationFn: logout,
        onSettled: () => resetClientState(),
    });
}

export function useUpdateProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { username?: string; avatarUrl?: string }) =>
            updateProfile(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
        },
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (data: { oldPassword: string; newPassword: string }) =>
            changePassword(data),
    });
}

export function useRequestEmailChange() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { newEmail: string }) => requestEmailChange(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
        },
    });
}

export function useResendVerification() {
    return useMutation({
        mutationFn: resendVerification,
    });
}


