'use client';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setAuthInterceptors } from '../lib/api';
import { useAuthStore } from '../store/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    setAuthInterceptors();
    setHydrated(true);
  }, [setHydrated]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
