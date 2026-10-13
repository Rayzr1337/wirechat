import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, logout } from '../api/auth';
// import { resetClientState } from '../lib/resetClientState()'

export function useLogin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (p: { email: string, password: string }) => login(p.email, p.password), 
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    });
}

export function useLogout() {
    return useMutation({
        mutationFn: logout,
//      onSettled: () => resetClientState
    });
}


