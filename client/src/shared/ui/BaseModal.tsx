import { TITLES } from '@/shared/config';
import { CommonBtn, DecorateTitle, PageBackground, Title } from '@/shared/ui';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  confirmDisabled?: boolean;
  variant?: 'default' | 'scribble';
  buttonVariant?: 'default' | 'scribble';
}

const BaseModal = ({
  isOpen,
  onClose,
  title,
  message,
  children,
  onConfirm,
  confirmText = '확인',
  confirmDisabled = false,
  variant = 'scribble',
  buttonVariant = 'scribble',
}: BaseModalProps) => {
  if (!isOpen) return null;

  const containerClasses =
    variant === 'scribble' ? 'scribble-border scribble-border-box' : '';

  const titleClasses = 'font-handwriting mb-6 text-center text-4xl font-bold';

  const messageClasses =
    'font-handwriting text-2xl whitespace-pre-line text-gray-700';

  const btnVariant = buttonVariant === 'scribble' ? 'scribble' : 'radius';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
    >
      <PageBackground />

      {/* 상단 로고 영역 */}
      <div className="relative z-10 mb-6 flex flex-col items-center text-center">
        <span className="border-accent-warm bg-accent/30 text-accent-warm mb-2 inline-block -rotate-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] font-bold tracking-wide">
          ✨ 친구들과 함께하는 실시간 멀티플레이 드로잉 게임
        </span>

        <Title title={TITLES.MAIN} fontSize="text-5xl" />
        <DecorateTitle />
      </div>

      {/* 모달 콘텐츠 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl ${containerClasses}`}
      >
        <h2 className={titleClasses}>{title}</h2>
        {message && <p className={messageClasses}>{message}</p>}
        {children}
        <div className="mt-6">
          <CommonBtn
            variant={btnVariant}
            icon={buttonVariant === 'scribble' ? 'check_circle' : undefined}
            text={confirmText}
            onClick={confirmDisabled ? undefined : onConfirm}
            disabled={confirmDisabled}
            color="blue"
          />
        </div>
      </div>
    </div>
  );
};

export default BaseModal;
