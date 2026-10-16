import { QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/client";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof ApiError && err.statusCode === 401) {
        queryClient.setQueryData(["me"], null);
      }
    },
  }),
  defaultOptions: {
    queries: { staleTime: 3 * 60 * 1000, retry: false },
  },
});
