import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DoodleLayout from '@/components/layouts/DoodleLayout';
import { PATHS } from '@/constants/paths';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [selectedRounds, setSelectedRounds] = useState(5);
  const [selectedTime, setSelectedTime] = useState(90);

  const roundOptions = [3, 5, 7, 10];
  const timeOptions = [60, 90, 120, 180];

  return (
    <DoodleLayout>
      <div className="flex h-full w-full items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="font-handwriting mb-2 text-4xl font-black md:text-5xl">
              방 설정 하기
            </h1>
            <div className="mx-auto h-2 w-48 rounded-full bg-yellow-300" />
          </div>

          <div className="rounded-2xl border-2 border-gray-800 bg-white p-6 shadow-lg">
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="font-handwriting text-lg font-bold">
                  참가 인원
                </label>
                <span className="font-handwriting text-sm text-blue-600">
                  Player
                </span>
              </div>
              <select className="font-handwriting w-full cursor-pointer appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-base transition-colors hover:border-gray-400">
                <option>4명 (수정)</option>
                <option>2명</option>
                <option>3명</option>
                <option>5명</option>
                <option>6명</option>
              </select>
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="font-handwriting text-lg font-bold">
                  라운드 수
                </label>
                <span className="font-handwriting text-sm text-blue-600">
                  Round
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {roundOptions.map((rounds) => (
                  <button
                    key={rounds}
                    onClick={() => setSelectedRounds(rounds)}
                    className={`font-handwriting rounded-lg py-2.5 text-lg font-bold transition-all ${
                      selectedRounds === rounds
                        ? 'border-2 border-blue-500 bg-blue-100 text-blue-700'
                        : 'border-2 border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {rounds}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="font-handwriting text-lg font-bold">
                  제한 시간
                </label>
                <span className="font-handwriting text-sm text-blue-600">
                  Time
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`font-handwriting rounded-lg py-2.5 text-base font-bold transition-all ${
                      selectedTime === time
                        ? 'border-2 border-blue-500 bg-blue-100 text-blue-700'
                        : 'border-2 border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {time}s
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate(PATHS.WAITING_ROOM)}
              className="font-handwriting flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xl font-bold text-white shadow-md transition-colors hover:bg-indigo-700"
            >
              <span className="material-symbols-outlined text-2xl">
                check_circle
              </span>
              방 만들기 완료
            </button>
          </div>

          <div className="mt-4 text-center">
            <a
              href={PATHS.HOME}
              className="font-handwriting text-base text-gray-500 transition-colors hover:text-gray-700"
            >
              ← 메인으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </DoodleLayout>
  );
}
