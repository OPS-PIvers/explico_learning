import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  isError: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<void>;
  error: Error | null;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  onError,
  onSuccess,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dataRef = useRef<T>(data);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveData = useCallback(async () => {
    if (!enabled || isSaving) return;

    setIsSaving(true);
    setIsError(false);
    setError(null);

    try {
      await onSave(dataRef.current);
      setLastSaved(new Date());
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      setIsError(true);
      setError(error);
      onError?.(error);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, isSaving, onSave, onError, onSuccess]);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return saveData();
  }, [saveData]);

  // Auto-save with debouncing
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveData();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, saveData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    isError,
    lastSaved,
    saveNow,
    error,
  };
}
