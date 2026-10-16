import { useQuery } from "@tanstack/react-query";
import { getMe, type Me } from '../api/auth';
import { ApiError } from "../api/client";

export function useMe() {
    return useQuery<Me | null>({
        queryKey: ["me"],
        queryFn: async () => {
            try {
                return await getMe();
            } catch (err) {
                if (err instanceof ApiError && err.statusCode === 401) return null;
                throw err;
            }
        },
        retry: false,
        staleTime: 3 * 60 * 1000,
    });
}
