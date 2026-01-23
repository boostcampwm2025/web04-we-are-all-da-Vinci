/**
 * 사용자 고유 ID 관리
 * 아바타 생성을 위한 seed로 사용되며, 닉네임과 독립적으로 유지됨
 */
export const getProfileId = (): string => {
  let profileId = localStorage.getItem('profileId');

  if (!profileId) {
    profileId = crypto.randomUUID();
    localStorage.setItem('profileId', profileId);
  }

  return profileId;
};

/**
 * 새로운 UUID를 생성하여 저장하고 반환
 * 아바타를 랜덤으로 변경할 때 사용
 */
export const regenerateProfileId = (): string => {
  const newProfileId = crypto.randomUUID();
  localStorage.setItem('profileId', newProfileId);
  return newProfileId;
};
