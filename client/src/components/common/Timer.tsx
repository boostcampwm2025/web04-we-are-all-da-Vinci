import { useEffect, useState } from 'react';

interface TimerProps {
  time: number;
}

const Timer = ({ time }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(time);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  return (
    <div className="relative inline-block">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-red-500 bg-white shadow-xl">
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400">
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

export default Timer;
