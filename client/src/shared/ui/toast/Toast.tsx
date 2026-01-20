import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const iconClasses = {
  scribble:
    'material-symbols-outlined mr-2 text-3xl transition-transform group-hover:scale-110',
  radius: 'material-symbols-outlined text-2xl',
};

const typeIconMap: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'cancel',
  info: 'info',
};

const typeColorMap: Record<ToastType, string> = {
  success: 'bg-green-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
};

export const Toast = ({
  message,
  type,
  onClose,
  duration = 2000,
}: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex">
      <div
        className={`font-handwriting pointer-events-auto flex items-center gap-2 rounded-xl px-6 py-4 text-2xl font-bold text-white shadow-lg backdrop-blur-sm ${typeColorMap[type]} `}
        style={{ animation: 'var(--animate-toast)' }}
      >
        <span className={iconClasses.radius}>{typeIconMap[type]}</span>
        <p>{message}</p>
      </div>
    </div>
  );
};
