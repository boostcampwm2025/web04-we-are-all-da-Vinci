interface RoomCodeCopyProps {
  onCopy: () => void;
}

export const RoomCodeCopy = ({ onCopy }: RoomCodeCopyProps) => {
  return (
    <button
      onClick={onCopy}
      className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 transition-all hover:bg-blue-100 active:scale-95 md:px-4 md:py-2"
    >
      <span className="material-symbols-outlined text-lg text-blue-600">
        content_copy
      </span>
      <span className="text-sm font-bold text-gray-700 md:text-base">
        친구 초대 링크 복사하기
      </span>
    </button>
  );
};
