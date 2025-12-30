import { useState } from 'react';
import { PATHS } from '@/shared/config';
import Title from '@/entities/components/common/Title';
import { TITLES } from '@/shared/config/titles';
import UserCard from '@/entities/components/common/UserCard';
import CommonBtn from '@/entities/components/common/CommonBtn';

export default function WaitingRoom() {
  const [players] = useState([
    { id: 1, nickname: '나(방장)', status: '준비완료', isHost: true },
    { id: 2, nickname: '김그림', status: '대기중', isHost: false },
    { id: 3, nickname: 'ArtMaster', status: '대기중', isHost: false },
    { id: 4, nickname: '낙서왕', status: '대기중', isHost: false },
  ]);

  const emptySlots = 8 - players.length;
  const roomId = 'ABC-1234';

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('방 코드가 복사되었습니다!');
  };

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-7xl flex-col">
          <div className="mb-5 shrink-0 text-center">
            <Title title={TITLES.ROOM} fontSize="text-6xl" />
            <p className="font-handwriting text-lg text-gray-600">
              친구들이 모일 때까지 기다려주세요!
            </p>
          </div>

          <div className="flex flex-2 gap-7">
            <div className="flex-1">
              <div className="flex flex-col rounded-2xl border-2 border-gray-800 bg-white p-6 shadow-lg">
                <div className="mb-5 flex shrink-0 items-center justify-between">
                  <h2 className="font-handwriting flex items-center gap-2 text-2xl font-bold">
                    인원
                    <span className="text-lg text-gray-500">
                      ({players.length}/8)
                    </span>
                  </h2>
                  <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2">
                    <span className="material-symbols-outlined text-base text-blue-600">
                      tag
                    </span>
                    <span className="text-base font-bold text-gray-700">
                      ROOM ID: {roomId}
                    </span>
                    <button
                      onClick={copyRoomId}
                      className="material-symbols-outlined cursor-pointer text-lg text-blue-600 hover:text-blue-800"
                    >
                      content_copy
                    </button>
                  </div>
                </div>

                {/* 참가자 그리드 */}
                <div className="grid grid-cols-4 gap-5">
                  {/* 기존 참가자들 */}
                  {players.map((player) => (
                    <UserCard
                      id={player.id}
                      nickname={player.nickname}
                      isHost={player.isHost}
                      status={player.status}
                    />
                  ))}

                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 text-center opacity-50"
                    >
                      <div className="mx-auto mb-2 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <span className="material-symbols-outlined text-4xl text-gray-300">
                          +
                        </span>
                      </div>
                      <div className="font-handwriting text-sm text-gray-400">
                        빈자리
                      </div>
                      <div className="font-handwriting text-sm text-transparent">
                        placeholder
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex w-96 flex-col justify-center gap-4">
              <div className="rounded-2xl border-2 border-gray-800 bg-yellow-50 p-5 shadow-lg">
                <h3 className="font-handwriting mb-5 text-center text-2xl font-bold">
                  게임 설정
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl text-gray-600">
                        group
                      </span>
                      <span className="font-handwriting text-xl">
                        최대 인원
                      </span>
                    </div>
                    <span className="text-xl font-bold">8명</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl text-gray-600">
                        replay
                      </span>
                      <span className="font-handwriting text-xl">라운드</span>
                    </div>
                    <span className="text-xl font-bold">5 라운드</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl text-gray-600">
                        schedule
                      </span>
                      <span className="font-handwriting text-xl">
                        그리기 시간
                      </span>
                    </div>
                    <span className="text-xl font-bold">90초</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl text-gray-600">
                        draw
                      </span>
                      <span className="font-handwriting text-xl">주제</span>
                    </div>
                    <span className="text-xl font-bold">랜덤</span>
                  </div>
                </div>
              </div>

              <CommonBtn
                variant="radius"
                icon="play_arrow"
                text="게임 시작"
                color="blue"
                path={PATHS.GAME_START}
              />

              <div className="grid grid-cols-2 gap-4">
                <CommonBtn
                  variant="radius"
                  icon="settings"
                  text="설정 변경"
                  color="gray"
                />
                <CommonBtn
                  variant="radius"
                  icon="logout"
                  text="나가기"
                  path={PATHS.HOME}
                  color="red"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
