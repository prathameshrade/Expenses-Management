import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useApi = <T,>(
  apiCall: () => Promise<T>
): UseApiState<T> & { execute: () => Promise<void> } => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof AxiosError
        ? error.response?.data?.error || error.message
        : 'An error occurred';
      setState({ data: null, loading: false, error: errorMessage });
    }
  }, [apiCall]);

  return { ...state, execute };
};