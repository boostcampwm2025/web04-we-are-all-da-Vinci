import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

type RoomState = 'WAITING' | 'PLAYING' | 'ENDED';

interface PlayerData {
  userId: string;
  score: number;
  isHost: boolean;
  rank: number;
  roomState: RoomState;
}

interface RoundResult {
  userId: string;
  score: number;
  rank: number;
  drawing: [[number[], number[]]];
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  players: PlayerData[];
  roomState: RoomState;
  roundResults: RoundResult[] | null;
  currentUser: { nickname: string; isHost: boolean } | null;

  // Actions
  joinRoom: (nickname: string) => void;
  startGame: () => void;
  updateScore: (score: number) => void;
  submitDrawing: (score: number, strokes: number[][][]) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [roomState, setRoomState] = useState<RoomState>('WAITING');
  const [roundResults, setRoundResults] = useState<RoundResult[] | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    nickname: string;
    isHost: boolean;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const currentNicknameRef = useRef<string>('');

  useEffect(() => {
    // 소켓 연결 초기화
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: false, // 수동 연결
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // 연결 이벤트
    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // 리더보드 업데이트 수신
    newSocket.on('leaderboard:update', (data: { players: PlayerData[] }) => {
      setPlayers(data.players);

      // 방 상태 업데이트 (첫 번째 플레이어의 roomState 사용)
      if (data.players.length > 0) {
        const firstPlayer = data.players[0];
        setRoomState(firstPlayer.roomState);
      }

      // 현재 사용자의 호스트 상태 업데이트
      if (currentNicknameRef.current) {
        const me = data.players.find(
          (p) => p.userId === currentNicknameRef.current,
        );
        if (me) {
          setCurrentUser({
            nickname: currentNicknameRef.current,
            isHost: me.isHost,
          });
        }
      }
    });

    // 라운드 종료 수신
    newSocket.on('round:end', (data: { results: RoundResult[] }) => {
      console.log('Round end:', data);
      setRoundResults(data.results);
    });

    // 에러 수신
    newSocket.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
      alert(`오류: ${data.message}`);
    });

    // 클린업
    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('leaderboard:update');
      newSocket.off('round:end');
      newSocket.off('error');
      newSocket.close();
    };
  }, []);

  // 방 입장
  const joinRoom = (nickname: string) => {
    if (!socketRef.current) return;

    currentNicknameRef.current = nickname;

    // 소켓이 연결되지 않았다면 연결
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    // 연결 후 room:join 이벤트 전송
    const emitJoin = () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('room:join', { userId: nickname });
      }
    };

    if (socketRef.current.connected) {
      emitJoin();
    } else {
      // 연결 완료를 기다렸다가 전송
      socketRef.current.once('connect', () => {
        emitJoin();
      });
    }
  };

  // 게임 시작
  const startGame = () => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('drawing:start');
  };

  // 점수 업데이트
  const updateScore = (score: number) => {
    if (!socketRef.current?.connected || !currentNicknameRef.current) return;
    socketRef.current.emit('score:update', {
      userId: currentNicknameRef.current,
      score,
    });
  };

  // 그림 제출
  const submitDrawing = (score: number, strokes: number[][][]) => {
    if (!socketRef.current?.connected || !currentNicknameRef.current) return;

    // strokes를 서버가 기대하는 형식으로 변환
    const drawing: [[number[], number[]]] = strokes.map((stroke) => [
      stroke.map((point) => point[0]), // x 좌표 배열
      stroke.map((point) => point[1]), // y 좌표 배열
    ]) as [[number[], number[]]];

    socketRef.current.emit('drawing:result', {
      userId: currentNicknameRef.current,
      score,
      drawing,
    });
  };

  const value: SocketContextType = {
    socket,
    connected,
    players,
    roomState,
    roundResults,
    currentUser,
    joinRoom,
    startGame,
    updateScore,
    submitDrawing,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
