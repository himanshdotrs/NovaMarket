import { QueryClient } from "@tanstack/react-query";

/**
 * Singleton query client so non-React modules (tx pipeline in
 * hooks/contract.ts) can invalidate cached contract reads after writes.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

/** Every contract read uses this prefix — invalidated together after writes. */
export const CONTRACT_ROOT_KEY = "contract";
