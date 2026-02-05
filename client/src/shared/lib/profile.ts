// 프로필 관련 localStorage 유틸리티

const STORAGE_KEYS = {
  NICKNAME: 'nickname',
  PROFILE_ID: 'profileId',
} as const;

// 닉네임 관련
export const getNickname = (): string => {
  return localStorage.getItem(STORAGE_KEYS.NICKNAME) || '';
};

export const setNickname = (nickname: string): void => {
  localStorage.setItem(STORAGE_KEYS.NICKNAME, nickname.trim());
};

export const hasNickname = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEYS.NICKNAME);
};

// 프로필 ID 관련 (아바타 seed)
export const getProfileId = (): string => {
  let profileId = localStorage.getItem(STORAGE_KEYS.PROFILE_ID);

  if (!profileId) {
    profileId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.PROFILE_ID, profileId);
  }

  return profileId;
};

export const regenerateProfileId = (): string => {
  const newProfileId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEYS.PROFILE_ID, newProfileId);
  return newProfileId;
};

export const setProfileId = (profileId: string): void => {
  localStorage.setItem(STORAGE_KEYS.PROFILE_ID, profileId);
};

// 첫 방문 여부
export const isFirstVisit = (): boolean => {
  return !hasNickname();
};
