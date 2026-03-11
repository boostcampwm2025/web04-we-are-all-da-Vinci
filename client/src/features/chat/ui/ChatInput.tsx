import { useRef } from 'react';
import Input from '@/shared/ui/Input';
import { CHAT_MAX_LENGTH } from '../model/types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const value = inputRef.current?.value ?? '';
    if (!value.trim() || disabled) return;
    onSendMessage(value);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="border-stroke-default bg-surface-default border-t p-1">
      <Input
        ref={inputRef}
        onEnter={handleSend}
        maxLength={CHAT_MAX_LENGTH}
        placeholder="메시지 입력..."
        variant="default"
        className="text-lg"
      />
    </div>
  );
};
export default ChatInput;
