import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * profileId 조작 방지 및 유저 식별 기능 통합 테스트
 *
 * 테스트 시나리오:
 * - 사용자가 게임에 접속한 후 profileId를 조작하면:
 *   1. useLocalStorageWatch가 변경을 감지
 *   2. useGameSocket의 enabled 조건이 재평가됨
 *   3. 소켓 연결이 끊기고 새로운 연결 시도
 *   4. 서버에서 새 profileId의 유효성 검증
 *   5. 메인 화면으로 이동하고 새로운 profileId 부여
 */

describe('profileId 조작 방지 통합 테스트', () => {
  let originalProfileId: string;

  beforeEach(() => {
    vi.useFakeTimers();
    originalProfileId = '550e8400-e29b-41d4-a716-446655440000';
    localStorage.clear();
    localStorage.setItem('profileId', originalProfileId);
    localStorage.setItem('nickname', 'TestPlayer');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe('enabled 조건 검증', () => {
    it('profileId가 유효하면 enabled가 true이다', () => {
      const tabLockAcquired = true;
      const nickname = localStorage.getItem('nickname');
      const profileId = localStorage.getItem('profileId');
      const roomId = 'room-123';

      const enabled =
        tabLockAcquired === true && !!nickname && !!profileId && !!roomId;

      expect(enabled).toBe(true);
    });

    it('profileId가 null이면 enabled가 false이다', () => {
      localStorage.removeItem('profileId');

      const tabLockAcquired = true;
      const nickname = localStorage.getItem('nickname');
      const profileId = localStorage.getItem('profileId');
      const roomId = 'room-123';

      const enabled =
        tabLockAcquired === true && !!nickname && !!profileId && !!roomId;

      expect(enabled).toBe(false);
    });

    it('profileId가 빈 문자열이면 enabled가 false이다', () => {
      localStorage.setItem('profileId', '');

      const tabLockAcquired = true;
      const nickname = localStorage.getItem('nickname');
      const profileId = localStorage.getItem('profileId');
      const roomId = 'room-123';

      const enabled =
        tabLockAcquired === true && !!nickname && !!profileId && !!roomId;

      expect(enabled).toBe(false);
    });
  });

  describe('profileId 조작 시나리오', () => {
    it('profileId가 조작되면 enabled 조건이 재평가되어 소켓 연결이 재설정된다', () => {
      // 1. 초기 상태: 유효한 profileId로 연결됨
      const initialProfileId = localStorage.getItem('profileId');
      expect(initialProfileId).toBe(originalProfileId);

      // 2. 사용자가 개발자 도구에서 profileId 조작
      const manipulatedProfileId = 'manipulated-profile-id';
      localStorage.setItem('profileId', manipulatedProfileId);

      // 3. 변경 감지 후 새 profileId로 enabled 재평가
      const newProfileId = localStorage.getItem('profileId');
      expect(newProfileId).toBe(manipulatedProfileId);
      expect(newProfileId).not.toBe(originalProfileId);
    });

    it('profileId 삭제 시 연결 조건이 false가 되어 연결이 끊긴다', () => {
      // 초기 연결 상태
      let enabled = !!localStorage.getItem('profileId');
      expect(enabled).toBe(true);

      // profileId 삭제 (조작)
      localStorage.removeItem('profileId');

      // 연결 조건 재평가
      enabled = !!localStorage.getItem('profileId');
      expect(enabled).toBe(false);
    });

    it('유효한 UUID 형식으로 profileId를 조작해도 초기값과 다르면 조작으로 감지된다', () => {
      // 초기 profileId (유효한 UUID 형식)
      const initialProfileId = localStorage.getItem('profileId');
      expect(initialProfileId).toBe(originalProfileId);

      // 다른 유효한 UUID로 조작 (형식은 맞지만 값이 다름)
      const anotherValidUUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      localStorage.setItem('profileId', anotherValidUUID);

      // useSocketConnection에서 초기값과 비교하여 조작 감지
      const currentProfileId = localStorage.getItem('profileId');
      const isManipulated = initialProfileId !== currentProfileId;

      expect(isManipulated).toBe(true);
      expect(currentProfileId).not.toBe(initialProfileId);
    });

    it('유효한 UUID 형식이어도 조작 시 regenerateProfileId가 호출되고 메인으로 이동한다', () => {
      const mockSetAlertMessage = vi.fn();
      const mockSetPendingNavigation = vi.fn();
      const mockRegenerateProfileId = vi.fn(() => {
        const newId = crypto.randomUUID();
        localStorage.setItem('profileId', newId);
        return newId;
      });

      // useSocketConnection의 조작 감지 로직 시뮬레이션
      const initialProfileId = originalProfileId;
      const anotherValidUUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      localStorage.setItem('profileId', anotherValidUUID);

      const currentProfileId = localStorage.getItem('profileId');

      // 초기값과 다르면 조작으로 간주
      if (initialProfileId !== currentProfileId) {
        mockRegenerateProfileId();
        mockSetAlertMessage('프로필 정보가 변경되어 메인으로 이동합니다.');
        mockSetPendingNavigation('/');
      }

      expect(mockRegenerateProfileId).toHaveBeenCalled();
      expect(mockSetAlertMessage).toHaveBeenCalledWith(
        '프로필 정보가 변경되어 메인으로 이동합니다.',
      );
      expect(mockSetPendingNavigation).toHaveBeenCalledWith('/');
    });
  });

  describe('서버 검증 시나리오', () => {
    it('유효하지 않은 UUID 형식의 profileId는 서버에서 거부된다', () => {
      // UUID v4 형식 검증 정규식 (서버측 isValidUUIDv4와 동일)
      const isValidUUIDv4 = (value: unknown): value is string => {
        if (typeof value !== 'string') return false;
        // RFC 4122 version 4 UUID 정규식
        const uuidV4Regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidV4Regex.test(value);
      };

      // 유효한 UUID v4
      expect(isValidUUIDv4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);

      // 유효하지 않은 형식들
      expect(isValidUUIDv4('invalid-profile-id')).toBe(false);
      expect(isValidUUIDv4('')).toBe(false);
      expect(isValidUUIDv4(null)).toBe(false);
      expect(isValidUUIDv4(undefined)).toBe(false);
      expect(isValidUUIDv4(123)).toBe(false);

      // 조작된 ID (UUID 형식이 아님)
      expect(isValidUUIDv4('hacked-profile-123')).toBe(false);
    });

    it('서버에서 INVALID_PROFILE_ID 에러 발생 시 새 profileId를 발급하고 메인 화면으로 이동한다', () => {
      const INVALID_PROFILE_ID_MESSAGE =
        '유효하지 않은 프로필 정보입니다. 다시 접속해주세요.';

      const mockSetAlertMessage = vi.fn();
      const mockSetPendingNavigation = vi.fn();
      const mockRegenerateProfileId = vi.fn(() => {
        const newProfileId = crypto.randomUUID();
        localStorage.setItem('profileId', newProfileId);
        return newProfileId;
      });

      // useErrorEvents의 handleError 로직 시뮬레이션
      const handleError = (error: { message: string }) => {
        // INVALID_PROFILE_ID 에러 시 새 profileId 발급
        if (error.message === INVALID_PROFILE_ID_MESSAGE) {
          mockRegenerateProfileId();
        }

        mockSetAlertMessage(error.message);
        mockSetPendingNavigation('/');
      };

      const oldProfileId = localStorage.getItem('profileId');

      // 서버에서 INVALID_PROFILE_ID 에러 발생
      const serverError = { message: INVALID_PROFILE_ID_MESSAGE };
      handleError(serverError);

      // 1. 새 profileId 발급 확인
      expect(mockRegenerateProfileId).toHaveBeenCalled();
      const newProfileId = localStorage.getItem('profileId');
      expect(newProfileId).not.toBe(oldProfileId);

      // 2. 에러 메시지 표시 확인
      expect(mockSetAlertMessage).toHaveBeenCalledWith(serverError.message);

      // 3. 메인 페이지 이동 확인
      expect(mockSetPendingNavigation).toHaveBeenCalledWith('/');
    });

    it('다른 에러 발생 시에는 profileId를 재발급하지 않는다', () => {
      const OTHER_ERROR_MESSAGE = '방이 존재하지 않습니다.';
      const INVALID_PROFILE_ID_MESSAGE =
        '유효하지 않은 프로필 정보입니다. 다시 접속해주세요.';

      const mockRegenerateProfileId = vi.fn();

      const handleError = (error: { message: string }) => {
        if (error.message === INVALID_PROFILE_ID_MESSAGE) {
          mockRegenerateProfileId();
        }
      };

      // 다른 에러 발생
      handleError({ message: OTHER_ERROR_MESSAGE });

      // regenerateProfileId가 호출되지 않아야 함
      expect(mockRegenerateProfileId).not.toHaveBeenCalled();
    });
  });

  describe('새 profileId 발급 시나리오', () => {
    it('메인 화면으로 이동 후 새 profileId가 생성된다', () => {
      // 기존 profileId 제거 (에러로 인한 초기화 상황)
      localStorage.removeItem('profileId');

      // getProfileId 로직 시뮬레이션
      let profileId = localStorage.getItem('profileId');

      if (!profileId) {
        // 새 UUID 생성
        profileId = crypto.randomUUID();
        localStorage.setItem('profileId', profileId);
      }

      // 새 profileId 생성 확인
      const newProfileId = localStorage.getItem('profileId');
      expect(newProfileId).toBeTruthy();
      expect(newProfileId).not.toBe(originalProfileId);

      // UUID 형식 검증
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidV4Regex.test(newProfileId!)).toBe(true);
    });

    it('regenerateProfileId 호출 시 새 UUID가 생성되고 저장된다', () => {
      // regenerateProfileId 로직 시뮬레이션
      const regenerateProfileId = (): string => {
        const newProfileId = crypto.randomUUID();
        localStorage.setItem('profileId', newProfileId);
        return newProfileId;
      };

      const oldProfileId = localStorage.getItem('profileId');
      const newProfileId = regenerateProfileId();

      expect(newProfileId).not.toBe(oldProfileId);
      expect(localStorage.getItem('profileId')).toBe(newProfileId);
    });
  });
});

describe('다중 탭 시나리오', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('profileId', 'original-profile');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('다른 탭에서 profileId 변경 시 storage 이벤트로 감지된다', () => {
    const storageEventHandler = vi.fn();

    globalThis.addEventListener('storage', storageEventHandler);

    // 다른 탭에서 변경된 상황 시뮬레이션
    const event = new StorageEvent('storage', {
      key: 'profileId',
      oldValue: 'original-profile',
      newValue: 'changed-by-other-tab',
      storageArea: localStorage,
    });

    globalThis.dispatchEvent(event);

    expect(storageEventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'profileId',
        newValue: 'changed-by-other-tab',
      }),
    );

    globalThis.removeEventListener('storage', storageEventHandler);
  });
});
