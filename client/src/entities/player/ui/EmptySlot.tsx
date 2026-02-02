import { useToastStore } from '@/shared/model';
import { MIXPANEL_EVENTS } from '@/shared/config';
import { trackEvent } from '@/shared/lib/mixpanel';

export const EmptySlot = () => {
  const { addToast } = useToastStore();

  const handleInviteClick = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.location.href);
      trackEvent(MIXPANEL_EVENTS.CLICK_INVITE_EMPTY_SLOT);
      addToast('초대 링크가 복사되었습니다!', 'success');
    } catch (e) {
      console.error('클립보드 복사 실패', e);
      addToast('링크 복사에 실패했습니다.', 'error');
    }
  };

  return (
    <div
      onClick={handleInviteClick}
      className="border-stroke-default flex h-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-2 text-center opacity-60 transition-opacity hover:opacity-100 sm:p-4 lg:p-6"
    >
      <div className="mx-auto mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <span className="material-symbols-outlined text-2xl text-gray-500 sm:text-3xl lg:text-4xl">
          person_add
        </span>
      </div>
      <div className="font-handwriting text-xs text-gray-500 sm:text-sm">
        초대하기
      </div>
    </div>
  );
};
