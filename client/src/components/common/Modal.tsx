import Input from '@/components/common/Input';

interface BaseModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

interface InputModalProps extends BaseModalProps {
  modalType: 'input';
  nickname: string;
  setNickname: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onSubmit: () => void;
}

interface AlertModalProps extends BaseModalProps {
  modalType: 'alert';
  message: string;
}

type ModalProps = InputModalProps | AlertModalProps;

const Modal = (props: ModalProps) => {
  const { modalType, title, isOpen, onClose } = props;

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (modalType === 'input') {
      props.onSubmit();
    }
    onClose();
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl">
        <h2 className="font-handwriting mb-6 text-center text-3xl font-bold">
          {title}
        </h2>

        {modalType === 'input' ? (
          <Input
            value={props.nickname}
            onChange={props.setNickname}
            placeholder={props.placeholder}
            maxLength={props.maxLength}
            onEnter={handleSubmit}
          />
        ) : (
          <p className="font-handwriting mb-6 text-center text-lg text-gray-700">
            {props.message}
          </p>
        )}

        <button
          onClick={handleSubmit}
          className="font-handwriting w-full rounded-xl bg-indigo-500 py-3 text-xl font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={modalType === 'input' && !props.nickname.trim()}
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default Modal;
