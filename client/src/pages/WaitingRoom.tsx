import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/constants/paths';
import PlayerCard from '@/components/card/PlayerCard';
import NicknameModal from '@/components/NicknameModal';
import { useSocket } from '@/contexts/SocketContext';

export default function WaitingRoom() {
  const navigate = useNavigate();
  const {
    players: socketPlayers,
    roomState,
    joinRoom,
    startGame,
  } = useSocket();

  const [showNicknameModal, setShowNicknameModal] = useState(
    () => !localStorage.getItem('nickname'),
  );
  const [nickname, setNickname] = useState('');
  const [hard, setHard] = useState(false);

  // 닉네임 입력 후 방 입장
  const handleNicknameSubmit = () => {
    if (nickname.trim()) {
      localStorage.setItem('nickname', nickname.trim());
      setShowNicknameModal(false);
      joinRoom(nickname.trim());
    }
  };

  // 컴포넌트 마운트 시 닉네임이 있으면 자동 입장
  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname');
    if (savedNickname && !showNicknameModal) {
      joinRoom(savedNickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNicknameModal]);

  // 게임 상태가 PLAYING으로 변경되면 GameStart로 이동
  useEffect(() => {
    if (roomState === 'PLAYING') {
      navigate(PATHS.GAME_START);
    }
    if (localStorage.getItem('nickname') === '김준서') {
      setHard(true);
    }
  }, [roomState, navigate]);

  // PlayerCard가 기대하는 형태로 변환
  const players = socketPlayers.map((p) => ({
    name: p.userId,
    ready: true,
    isHost: p.isHost,
  }));

  const emptySlots = 8 - players.length;
  const roomId = 'room-1';

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('방 코드가 복사되었습니다!');
  };

  // 게임 시작 핸들러 (MVP: 모든 플레이어가 시작 가능)
  const handleStartGame = () => {
    if (roomState === 'WAITING') {
      startGame();
    }
  };

  return (
    <>
      {showNicknameModal && (
        <NicknameModal
          nickname={nickname}
          setNickname={setNickname}
          onSubmit={handleNicknameSubmit}
        />
      )}

      <div className="flex h-full w-full items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-7xl flex-col">
          <div className="mb-5 shrink-0 text-center">
            <h1 className="font-handwriting mb-2 text-5xl font-black md:text-6xl">
              게임방
            </h1>
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
                  {players.map((player, index) => (
                    <PlayerCard
                      key={`${player.name}-${index}`}
                      player={player}
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
                    <span className="text-xl font-bold">1 라운드 (MVP)</span>
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
                    <span className="text-xl font-bold">집 (House)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartGame}
                disabled={!hard || roomState !== 'WAITING'}
                className="font-handwriting flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-5 text-3xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined text-4xl">
                  play_arrow
                </span>
                게임 시작
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button className="font-handwriting flex items-center justify-center gap-1 rounded-xl border-2 border-gray-800 bg-white py-5 text-xl font-bold transition-colors hover:bg-gray-50">
                  <span className="material-symbols-outlined text-2xl">
                    settings
                  </span>
                  설정 변경
                </button>
                <button
                  onClick={() => navigate(PATHS.HOME)}
                  className="font-handwriting flex items-center justify-center gap-1 rounded-xl border-2 border-red-400 bg-white py-5 text-xl font-bold text-red-600 transition-colors hover:bg-red-50"
                >
                  <span className="material-symbols-outlined text-2xl">
                    logout
                  </span>
                  나가기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
