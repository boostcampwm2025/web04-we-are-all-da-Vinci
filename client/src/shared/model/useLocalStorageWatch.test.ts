import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorageWatch } from './useLocalStorageWatch';

describe('useLocalStorageWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('초기 값 로드', () => {
    it('localStorage에 값이 있으면 해당 값을 반환한다', () => {
      localStorage.setItem('profileId', 'initial-profile-id');

      const { result } = renderHook(() => useLocalStorageWatch('profileId'));

      expect(result.current).toBe('initial-profile-id');
    });

    it('localStorage에 값이 없으면 null을 반환한다', () => {
      const { result } = renderHook(() => useLocalStorageWatch('profileId'));

      expect(result.current).toBeNull();
    });
  });

  describe('같은 탭에서의 변경 감지 (interval)', () => {
    it('localStorage 값이 변경되면 100ms 후 새 값을 반영한다', async () => {
      localStorage.setItem('profileId', 'original-id');

      const { result } = renderHook(() => useLocalStorageWatch('profileId'));
      expect(result.current).toBe('original-id');

      // localStorage 값 변경 (사용자가 개발자 도구에서 조작한 상황 시뮬레이션)
      localStorage.setItem('profileId', 'manipulated-id');

      // 100ms 이전에는 변화 없음
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current).toBe('original-id');

      // 100ms 후에는 새 값 반영
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current).toBe('manipulated-id');
    });

    it('localStorage 값이 삭제되면 null을 반환한다', async () => {
      localStorage.setItem('profileId', 'original-id');

      const { result } = renderHook(() => useLocalStorageWatch('profileId'));
      expect(result.current).toBe('original-id');

      // localStorage 값 삭제
      localStorage.removeItem('profileId');

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBeNull();
    });
  });

  describe('다른 탭에서의 변경 감지 (storage 이벤트)', () => {
    it('storage 이벤트가 발생하면 즉시 새 값을 반영한다', async () => {
      localStorage.setItem('profileId', 'original-id');

      const { result } = renderHook(() => useLocalStorageWatch('profileId'));
      expect(result.current).toBe('original-id');

      // 다른 탭에서 변경된 상황 시뮬레이션 (storage 이벤트)
      localStorage.setItem('profileId', 'changed-from-other-tab');

      await act(async () => {
        globalThis.dispatchEvent(
          new StorageEvent('storage', {
            key: 'profileId',
            newValue: 'changed-from-other-tab',
            oldValue: 'original-id',
          }),
        );
      });

      expect(result.current).toBe('changed-from-other-tab');
    });
  });

  describe('정리 (cleanup)', () => {
    it('언마운트 시 interval이 정리된다', async () => {
      const { unmount } = renderHook(() => useLocalStorageWatch('profileId'));

      unmount();

      // 언마운트 후 interval이 여전히 동작하지 않는지 확인
      localStorage.setItem('profileId', 'new-value');

      // 오류 없이 타이머가 진행되어야 함
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
    });

    it('언마운트 시 storage 이벤트 리스너가 제거된다', async () => {
      const { unmount } = renderHook(() => useLocalStorageWatch('profileId'));

      unmount();

      // 언마운트 후 storage 이벤트가 오류를 발생시키지 않아야 함
      await act(async () => {
        globalThis.dispatchEvent(
          new StorageEvent('storage', {
            key: 'profileId',
            newValue: 'new-value',
          }),
        );
      });
    });
  });
});

describe('profileId 조작 감지 시나리오', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('게임 중 profileId가 조작되면 변경을 감지한다', async () => {
    // 초기 profileId 설정 (게임 접속 시)
    const originalProfileId = 'game-session-profile-id';
    localStorage.setItem('profileId', originalProfileId);

    const { result } = renderHook(() => useLocalStorageWatch('profileId'));
    expect(result.current).toBe(originalProfileId);

    // 사용자가 개발자 도구에서 profileId를 조작한 상황
    const manipulatedProfileId = 'hacked-profile-id';
    localStorage.setItem('profileId', manipulatedProfileId);

    // interval로 변경 감지
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // 변경된 값이 감지됨 → 이 값의 변경이 useGameSocket의 enabled를 재평가하게 함
    expect(result.current).toBe(manipulatedProfileId);
    expect(result.current).not.toBe(originalProfileId);
  });

  it('profileId가 빈 문자열로 변경되면 변경을 감지한다', async () => {
    localStorage.setItem('profileId', 'valid-profile-id');

    const { result } = renderHook(() => useLocalStorageWatch('profileId'));
    expect(result.current).toBe('valid-profile-id');

    // 빈 문자열로 조작
    localStorage.setItem('profileId', '');

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('');
  });

  it('키 변경 시 새로운 키를 감시한다', async () => {
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');

    const { result, rerender } = renderHook(
      ({ key }) => useLocalStorageWatch(key),
      { initialProps: { key: 'key1' } },
    );

    expect(result.current).toBe('value1');

    rerender({ key: 'key2' });

    // 키 변경 후 interval이 새 값을 체크할 때까지 대기
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('value2');
  });
});
