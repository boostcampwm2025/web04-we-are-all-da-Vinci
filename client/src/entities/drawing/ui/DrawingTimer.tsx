interface DrawingTimerProps {
  timeLeft: number;
}

export const DrawingTimer = ({ timeLeft }: DrawingTimerProps) => {
  return (
    <div className="relative inline-block">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-red-500 bg-white shadow-xl">
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400">
          <span className="material-symbols-outlined text-sm text-yellow-900">
            schedule
          </span>
        </div>
        <span className="font-handwriting text-4xl font-black text-red-500">
          {timeLeft}
        </span>
      </div>
      <div className="mt-1 text-center">
        <span className="font-handwriting text-xs text-gray-600">초</span>
      </div>
    </div>
  );
};
