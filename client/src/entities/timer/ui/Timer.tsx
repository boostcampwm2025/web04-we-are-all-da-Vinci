import { selectTimer, useGameStore } from '@/entities/gameRoom/model';

const URGENT_THRESHOLD = 5;

export const Timer = () => {
  const timer = useGameStore(selectTimer);
  const isUrgent = timer <= URGENT_THRESHOLD && timer > 0;

  return (
    <div className="absolute top-8 right-8 z-20">
      <div className="relative inline-block">
        <div
          className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 bg-white shadow-xl transition-all ${
            isUrgent ? 'animate-bounce border-red-600' : 'border-red-500'
          }`}
        >
          <div
            className={`absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full ${
              isUrgent ? 'animate-ping bg-red-600' : 'bg-yellow-400'
            }`}
          >
            <span
              className={`material-symbols-outlined text-sm ${
                isUrgent ? 'text-white' : 'text-yellow-900'
              }`}
            >
              schedule
            </span>
          </div>
          <span
            className={`font-handwriting text-4xl font-black transition-colors ${
              isUrgent ? 'animate-pulse text-red-600' : 'text-red-500'
            }`}
          >
            {timer}
          </span>
        </div>
        <div className="mt-1 text-center">
          <span className="font-handwriting text-xs text-gray-600">초</span>
        </div>
      </div>
    </div>
  );
};
