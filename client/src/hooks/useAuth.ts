import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from "react-router";
import { login, logout, register as registerUser } from '../api/auth';
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


