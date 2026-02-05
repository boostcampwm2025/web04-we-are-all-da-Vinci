import { io, Socket } from 'socket.io-client';
import { captureException } from '@/shared/lib/sentry';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

const setupSocketErrorHandlers = (socketInstance: Socket): void => {
  socketInstance.on('connect_error', (error: Error) => {
    captureException(new Error(`Socket connect error: ${error.message}`), {
      tags: {
        error_type: 'socket_connect_error',
      },
      level: 'error',
      extra: {
        socketUrl: SOCKET_URL,
        originalError: error.message,
      },
      fingerprint: ['소켓 연결 에러!', 'connect_error'],
    });
  });

  socketInstance.on('error', (error: Error) => {
    captureException(new Error(`Socket error: ${error.message}`), {
      tags: {
        error_type: 'socket_error',
      },
      level: 'error',
      extra: {
        socketUrl: SOCKET_URL,
        error: String(error),
      },
      fingerprint: ['소켓 에러!', 'general_error'],
    });
  });
};

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
    setupSocketErrorHandlers(socket);
  }
  // connect() 시점의 최신 profileId를 사용하도록 매번 갱신
  socket.auth = { profileId: localStorage.getItem('profileId') };
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
