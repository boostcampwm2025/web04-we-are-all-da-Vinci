import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// BroadcastChannel 모킹
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: ((event: MessageEvent) => void)[] = [];
  closed = false;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    if (this.closed) return;

    // 같은 채널 이름을 가진 다른 인스턴스들에게 메시지 전달
    MockBroadcastChannel.instances
      .filter(
        (instance) =>
          instance.name === this.name && instance !== this && !instance.closed,
      )
      .forEach((instance) => {
        const event = { data } as MessageEvent;
        instance.listeners.forEach((listener) => listener(event));
        instance.onmessage?.(event);
      });
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners = this.listeners.filter((l) => l !== listener);
    }
  }

  close() {
    this.closed = true;
    this.listeners = [];
  }

  static reset() {
    MockBroadcastChannel.instances = [];
  }
}

// sessionStorage 모킹
const createMockSessionStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
};

describe('tabLock', () => {
  let mockSessionStorage: ReturnType<typeof createMockSessionStorage>;

  beforeEach(() => {
    vi.useFakeTimers();
    MockBroadcastChannel.reset();
    mockSessionStorage = createMockSessionStorage();
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    vi.stubGlobal('sessionStorage', mockSessionStorage);
    vi.stubGlobal('crypto', {
      randomUUID: () => `uuid-${Math.random().toString(36).slice(2)}`,
    });
    // 매 테스트마다 모듈 캐시 초기화
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('acquireTabLockAsync', () => {
    it('첫 번째 탭은 잠금을 획득한다', async () => {
      const { acquireTabLockAsync } = await import('./tabLock');
      const lockPromise = acquireTabLockAsync('room-1');

      await vi.advanceTimersByTimeAsync(100);
      const result = await lockPromise;

      expect(result.acquired).toBe(true);
      expect(typeof result.release).toBe('function');
    });

    it('두 번째 탭(다른 채널 인스턴스)은 deny를 받아 잠금 획득에 실패한다', async () => {
      const { acquireTabLockAsync } = await import('./tabLock');

      // 첫 번째 탭이 잠금 획득
      const lock1Promise = acquireTabLockAsync('room-1');
      await vi.advanceTimersByTimeAsync(100);
      const lock1 = await lock1Promise;

      expect(lock1.acquired).toBe(true);

      // 모듈을 다시 로드하여 다른 "탭" 시뮬레이션
      vi.resetModules();
      // 두 번째 탭은 새로운 sessionStorage를 가지므로 기존 tabId를 모름
      mockSessionStorage = createMockSessionStorage();
      vi.stubGlobal('sessionStorage', mockSessionStorage);

      const { acquireTabLockAsync: acquireFromTab2 } =
        await import('./tabLock');

      // 두 번째 탭이 잠금 시도
      const lock2Promise = acquireFromTab2('room-1');
      await vi.advanceTimersByTimeAsync(100);
      const lock2 = await lock2Promise;

      expect(lock2.acquired).toBe(false);
    });

    it('다른 roomId에는 별도로 잠금을 획득한다', async () => {
      const { acquireTabLockAsync } = await import('./tabLock');

      const lock1Promise = acquireTabLockAsync('room-1');
      await vi.advanceTimersByTimeAsync(100);
      const lock1 = await lock1Promise;

      const lock2Promise = acquireTabLockAsync('room-2');
      await vi.advanceTimersByTimeAsync(100);
      const lock2 = await lock2Promise;

      expect(lock1.acquired).toBe(true);
      expect(lock2.acquired).toBe(true);
    });

    it('같은 roomId에 중복 호출 시 기존 잠금을 재사용한다 (Strict Mode 대응)', async () => {
      const { acquireTabLockAsync } = await import('./tabLock');

      // 첫 번째 호출
      const lock1Promise = acquireTabLockAsync('room-1');
      await vi.advanceTimersByTimeAsync(100);
      const lock1 = await lock1Promise;

      // 두 번째 호출 (같은 탭에서 재호출 - 모듈 리셋 없음)
      const lock2 = await acquireTabLockAsync('room-1');

      expect(lock1.acquired).toBe(true);
      expect(lock2.acquired).toBe(true);
    });

    it('잠금 해제 후 새 탭이 잠금을 획득한다', async () => {
      const { acquireTabLockAsync } = await import('./tabLock');

      // 첫 번째 탭이 잠금 획득
      const lock1Promise = acquireTabLockAsync('room-1');
      await vi.advanceTimersByTimeAsync(100);
      const lock1 = await lock1Promise;

      expect(lock1.acquired).toBe(true);

      // 잠금 해제
      lock1.release();

      // 다른 탭 시뮬레이션
      vi.resetModules();
      mockSessionStorage = createMockSessionStorage();
      vi.stubGlobal('sessionStorage', mockSessionStorage);

      const { acquireTabLockAsync: acquireFromTab2 } =
        await import('./tabLock');

      const lock2Promise = acquireFromTab2('room-1');
      await vi.advanceTimersByTimeAsync(100);
      const lock2 = await lock2Promise;

      expect(lock2.acquired).toBe(true);
    });
  });

  describe('BroadcastChannel 미지원 환경', () => {
    it('BroadcastChannel이 없으면 항상 잠금 획득에 성공한다', async () => {
      vi.stubGlobal('BroadcastChannel', undefined);
      const { acquireTabLockAsync } = await import('./tabLock');

      const result = await acquireTabLockAsync('room-1');

      expect(result.acquired).toBe(true);
    });
  });
});
