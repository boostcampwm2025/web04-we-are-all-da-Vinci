import { isE2ETestMode } from './e2eTestMode';

const HEARTBEAT_INTERVAL = 3000; // heartbeat 전송 주기
const DEFAULT_WAIT_MS = 100; // claim 전송 후 다른 탭의 deny/heartbeat 응답을 기다리는 시간

interface TabLockResult {
  acquired: boolean;
  release: () => void;
}

interface LockState {
  tabId: string;
  channel: BroadcastChannel;
  refCount: number;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
}

/** 모듈 레벨에서 roomId별 잠금 상태 관리 (React Strict Mode 대응) */
const activeLocks = new Map<string, LockState>();

// ─────────────────────────────────────────────────────────────
// 유틸리티 함수
// ─────────────────────────────────────────────────────────────

/** ms만큼 대기 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** BroadcastChannel 지원 여부 확인 */
const isBroadcastChannelSupported = (): boolean =>
  typeof BroadcastChannel !== 'undefined';

// ─────────────────────────────────────────────────────────────
// 메시지 핸들러
// ─────────────────────────────────────────────────────────────

/**
 * 메시지 핸들러 생성.
 * deny/heartbeat 수신 시 denied 플래그 설정, claim 수신 시 리더면 deny 응답.
 */
const createBroadcastMessageHandler = (
  roomId: string,
  tabId: string,
  channel: BroadcastChannel,
  setDenied: () => void,
) => {
  const handler = (event: MessageEvent) => {
    const data = event.data as { type: string; tabId: string };

    // 자신의 메시지 무시
    if (data.tabId === tabId) return;

    // 다른 리더가 있음 → 획득 포기
    if (data.type === 'deny' || data.type === 'heartbeat') {
      setDenied();
    }

    // 다른 탭이 리더 요청 → 이미 리더면 거부
    if (data.type === 'claim') {
      const lock = activeLocks.get(roomId);
      if (lock?.tabId === tabId) {
        channel.postMessage({ type: 'deny', tabId });
      }
    }
  };

  return handler;
};

// ─────────────────────────────────────────────────────────────
// 리더 등록 / 해제
// ─────────────────────────────────────────────────────────────

/**
 * 리더로 등록하고 heartbeat 전송 시작.
 */
const registerAsLeader = (
  roomId: string,
  tabId: string,
  channel: BroadcastChannel,
): void => {
  const heartbeatTimer = setInterval(() => {
    channel.postMessage({
      type: 'heartbeat',
      tabId,
      timestamp: Date.now(),
    });
  }, HEARTBEAT_INTERVAL);

  // 즉시 heartbeat 전송
  channel.postMessage({ type: 'heartbeat', tabId, timestamp: Date.now() });

  activeLocks.set(roomId, { tabId, channel, refCount: 1, heartbeatTimer });
};

/**
 * 탭 잠금 해제. refCount가 0이 되면 채널을 닫고 리소스 정리.
 * @param roomId - 해제할 잠금의 방 ID
 */
const releaseTabLock = (roomId: string): void => {
  const lock = activeLocks.get(roomId);
  if (!lock) return;

  lock.refCount--;
  if (lock.refCount > 0) return; // Strict Mode 재마운트 대기

  if (lock.heartbeatTimer) {
    clearInterval(lock.heartbeatTimer);
  }
  lock.channel.postMessage({ type: 'release', tabId: lock.tabId });
  lock.channel.close();
  activeLocks.delete(roomId);
};

// ─────────────────────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────────────────────

/**
 * 비동기 탭 잠금. claim 후 대기 시간 동안 deny를 기다림.
 * 같은 roomId에 대한 중복 호출 시 기존 잠금 재사용 (React Strict Mode 대응).
 * @param roomId - 잠금을 획득할 방 ID
 * @param waitMs - 리더 응답 대기 시간 (ms), 기본값 100ms
 * @returns 잠금 획득 결과와 해제 함수
 */
export const acquireTabLockAsync = async (
  roomId: string,
  waitMs = DEFAULT_WAIT_MS,
): Promise<TabLockResult> => {
  // E2E 테스트 모드: tabLock 비활성화
  if (isE2ETestMode()) {
    return { acquired: true, release: () => {} };
  }

  // BroadcastChannel 미지원 환경
  if (!isBroadcastChannelSupported()) {
    return { acquired: true, release: () => {} };
  }

  // 이미 잠금이 있으면 재사용
  const existing = activeLocks.get(roomId);
  if (existing) {
    existing.refCount++;
    return { acquired: true, release: () => releaseTabLock(roomId) };
  }

  // 새 채널 생성 및 claim
  const channel = new BroadcastChannel(`game-lock:${roomId}`);
  const tabId = crypto.randomUUID();
  let denied = false;

  const messageHandler = createBroadcastMessageHandler(
    roomId,
    tabId,
    channel,
    () => {
      denied = true;
    },
  );

  channel.addEventListener('message', messageHandler);
  channel.postMessage({ type: 'claim', tabId });

  // 대기
  await delay(waitMs);

  // 결과 처리
  if (denied) {
    channel.removeEventListener('message', messageHandler);
    channel.close();
    return { acquired: false, release: () => {} };
  }

  registerAsLeader(roomId, tabId, channel);
  return { acquired: true, release: () => releaseTabLock(roomId) };
};
