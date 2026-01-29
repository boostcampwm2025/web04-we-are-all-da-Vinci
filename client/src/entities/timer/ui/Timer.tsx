import { selectPhase, selectTimer, useGameStore } from '@/entities/gameRoom';
import { SOUND_LIST } from '@/shared/config/sound';
import { SoundManager } from '@/shared/lib';
import { useEffect, useState } from 'react';
import { TIMER } from '../config';

const Timer = () => {
  const timer = useGameStore(selectTimer);
  const settings = useGameStore((state) => state.settings);
  const phase = useGameStore(selectPhase);
  const [hasStarted, setHasStarted] = useState(false);
  const [prevPhase, setPrevPhase] = useState(phase);

  // 페이즈가 바뀌면 시작 상태 초기화
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    setHasStarted(false);
  }

  // 타이머가 0보다 크면 시작된 것으로 간주 (렌더링 도중 실행)
  if (timer > 0 && !hasStarted) {
    setHasStarted(true);
  }

  // timer가 0이면 페이즈별 초기값 표시
  const getInitialTimeForPhase = () => {
    if (phase === 'PROMPT') return TIMER.PROMPT_TIME;
    if (phase === 'DRAWING') return settings.drawingTime;
    if (phase === 'ROUND_REPLAY') return TIMER.ROUND_REPLAY_TIME;
    if (phase === 'ROUND_STANDING') return TIMER.ROUND_STANDING_TIME;
    if (phase === 'GAME_END') return TIMER.GAME_END_TIME;
    return 0;
  };

  // 시작 전이고 timer가 0일 때만 초기값 표시, 그 외(끝나서 0이 된 경우 포함)는 timer 표시
  const displayTime =
    timer === 0 && !hasStarted ? getInitialTimeForPhase() : timer;
  const isUrgent = timer <= TIMER.URGENT_THRESHOLD && timer > TIMER.LOWER_LIMIT;

  useEffect(() => {
    if (!isUrgent) {
      return;
    }
    const manager = SoundManager.getInstance();
    manager.playSound(SOUND_LIST.TIMER);
  }, [isUrgent, displayTime]);

  return (
    <div className="absolute top-4 right-4 z-20 origin-top-right scale-70 md:top-8 md:right-8 md:scale-100">
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
            {displayTime}
          </span>
        </div>
      </div>
    </div>
  );
};
export default Timer;
