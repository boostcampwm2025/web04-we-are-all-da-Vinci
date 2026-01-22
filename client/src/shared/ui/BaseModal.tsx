import { TITLES } from '@/shared/config';
import { CommonBtn, Title, DecorateTitle } from '@/shared/ui';

import {
  BrushDoodle,
  JudyDoodle,
  LionDoodle,
  NickDoodle,
  PaletteDoodle,
  ScribbleDoodle,
  StarDoodle,
  SunDoodle,
  PainterDoodle,
} from '@/shared/ui/Doodles';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  confirmDisabled?: boolean;
}

const BaseModal = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = '확인',
  confirmDisabled = false,
}: BaseModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px]"
    >
      {/* Doodles */}
      <BrushDoodle />
      <JudyDoodle />
      <LionDoodle />
      <NickDoodle />
      <PaletteDoodle />
      <ScribbleDoodle />
      <StarDoodle />
      <SunDoodle />
      <PainterDoodle />

      {/* 상단 로고 영역 */}
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="border-accent-warm bg-accent/30 text-accent-warm mb-2 inline-block -rotate-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] font-bold tracking-wide">
          ✨ 친구들과 함께하는 실시간 멀티플레이 드로잉 게임
        </span>

        <Title title={TITLES.MAIN} fontSize="text-5xl" />
        <DecorateTitle />
      </div>

      {/* 모달 콘텐츠 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl"
      >
        <h2 className="font-handwriting mb-6 text-center text-4xl font-bold">
          {title}
        </h2>
        {children}
        <div className="mt-6">
          <CommonBtn
            variant="scribble"
            icon="check_circle"
            text={confirmText}
            onClick={confirmDisabled ? undefined : onConfirm}
          />
        </div>
      </div>
    </div>
  );
};

export default BaseModal;
