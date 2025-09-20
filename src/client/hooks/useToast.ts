import { useState, useCallback } from 'react';
import { Toast, ToastType } from '../components/common/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      options?: {
        title?: string;
        duration?: number;
        action?: {
          label: string;
          onClick: () => void;
        };
      }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = {
        id,
        type,
        message,
        title: options?.title,
        duration: options?.duration,
        action: options?.action,
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback(
    (message: string, options?: Parameters<typeof addToast>[2]) => {
      return addToast(message, 'success', options);
    },
    [addToast]
  );

  const showError = useCallback(
    (message: string, options?: Parameters<typeof addToast>[2]) => {
      return addToast(message, 'error', options);
    },
    [addToast]
  );

  const showWarning = useCallback(
    (message: string, options?: Parameters<typeof addToast>[2]) => {
      return addToast(message, 'warning', options);
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message: string, options?: Parameters<typeof addToast>[2]) => {
      return addToast(message, 'info', options);
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
