import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { ApiResponse } from '@mercury/shared';

interface RecurringSyncState {
  ready: boolean;
  error: string | null;
}

const RecurringSyncContext = createContext<RecurringSyncState>({ ready: false, error: null });

export function useRecurringSync() {
  return useContext(RecurringSyncContext);
}

interface RecurringSyncProviderProps {
  children: ReactNode;
}

export function RecurringSyncProvider({ children }: RecurringSyncProviderProps) {
  const [state, setState] = useState<RecurringSyncState>({ ready: false, error: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await api.post<ApiResponse<{ generated: number; errors: string[] }>>(
          '/recurring-transactions/process-due',
          {},
        );
        if (!cancelled) {
          setState({ ready: true, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            ready: true,
            error: err instanceof Error ? err.message : 'Failed to sync',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RecurringSyncContext.Provider value={state}>
      {children}
    </RecurringSyncContext.Provider>
  );
}
