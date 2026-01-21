import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ToastType } from './types';

interface ToastState {
  message: string | null;
  type: ToastType;
  duration?: number;
  setShow: (message: string, type: ToastType, duration?: number) => void;
  setHide: () => void;
}

export const useToastStore = create<ToastState>()(
  devtools(
    (set) => ({
      message: null,
      type: 'info',
      duration: 2000,
      setShow: (message, type, duration) => set({ message, type, duration }),
      setHide: () => set({ message: null }),
    }),
    { name: 'Toast Store' },
  ),
);
