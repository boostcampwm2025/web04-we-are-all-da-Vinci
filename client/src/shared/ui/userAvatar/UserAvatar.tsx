import Avatar from 'boring-avatars';

interface UserAvatarProps {
  name: string;
  size?: number;
}

// 프로젝트 공통 색상 팔레트
const AVATAR_PALETTE = [
  '#6366f1', // brand-primary (인디고)
  '#2563eb', // interactive-default (블루)
  '#f97316', // accent-warm (오렌지)
  '#facc15', // rank-gold (옐로우)
  '#22c55e', // success (그린)
];

export const UserAvatar = ({ name, size = 40 }: UserAvatarProps) => {
  return (
    <Avatar name={name} size={size} variant="beam" colors={AVATAR_PALETTE} />
  );
};
