interface NicknameModalProps {
  nickname: string;
  setNickname: (value: string) => void;
  onSubmit: () => void;
}

export default function NicknameModal({
  nickname,
  setNickname,
  onSubmit,
}: NicknameModalProps) {
  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl">
        <h2 className="font-handwriting mb-6 text-center text-3xl font-bold">
          닉네임을 입력해주세요
        </h2>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit();
            }
          }}
          placeholder="닉네임"
          className="font-handwriting mb-6 w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none"
          maxLength={10}
          autoFocus
        />
        <button
          onClick={onSubmit}
          className="font-handwriting w-full rounded-xl bg-indigo-500 py-3 text-xl font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={!nickname.trim()}
        >
          확인
        </button>
      </div>
    </div>
  );
}
