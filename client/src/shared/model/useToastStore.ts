import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Toast, ToastType } from './types';

interface ToastItem extends Toast {
  id: string;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>()(
  devtools(
    (set) => ({
      toasts: [],
      addToast: (message, type, duration = 2000) =>
        set((state) => {
          const newToast = { id: crypto.randomUUID(), message, type, duration };
          return { toasts: [...state.toasts, newToast] };
        }),
      removeToast: (id: string) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    { name: 'Toast Store' },
  ),
);
