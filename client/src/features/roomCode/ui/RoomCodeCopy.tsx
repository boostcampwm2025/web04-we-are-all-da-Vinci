interface RoomCodeCopyProps {
  roomId: string;
  onCopy: () => void;
}

export const RoomCodeCopy = ({ roomId, onCopy }: RoomCodeCopyProps) => {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2">
      <span className="material-symbols-outlined text-base text-blue-600">
        tag
      </span>
      <span className="hidden text-base font-bold text-gray-700 xl:inline">
        친구들을 초대하세요!:
      </span>
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-gray-700">{roomId}</span>
        <button
          onClick={onCopy}
          className="material-symbols-outlined cursor-pointer text-lg text-blue-600 hover:text-blue-800"
        >
          content_copy
        </button>
      </div>
    </div>
  );
};
