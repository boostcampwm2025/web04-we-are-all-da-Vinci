import { useState } from 'react';
import { PATHS } from '@/shared/config';
import Title from '@/entities/components/common/Title';
import { TITLES } from '@/shared/config/titles';
import CommonBtn from '@/entities/components/common/CommonBtn';

export default function CreateRoom() {
  const [selectedRounds, setSelectedRounds] = useState(5);
  const [selectedTime, setSelectedTime] = useState(90);

  const roundOptions = [3, 5, 7, 10];
  const timeOptions = [60, 90, 120, 180];

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4">
        <div className="flex flex-col items-center justify-center text-center">
          <Title title={TITLES.CREATE} fontSize={'text-6xl'} />
          <div className="w-100 rounded-2xl border-2 border-gray-800 bg-white p-6 shadow-lg">
            <div className="mb-5">
              <div className="mb-2 flex w-full items-center justify-between">
                <label className="font-handwriting text-lg font-bold">
                  플레이어
                </label>
                <span className="font-handwriting text-sm text-blue-600">
                  Player
                </span>
              </div>
              <select className="font-handwriting w-full cursor-pointer appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-base transition-colors hover:border-gray-400">
                <option>4명</option>
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
            <CommonBtn
              variant="scribble"
              icon="check_circle"
              text="방 만들기 완료"
              path={PATHS.WAITING_ROOM}
            />
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
    </>
  );
}
