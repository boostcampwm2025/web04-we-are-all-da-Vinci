import { useState } from 'react';
import Input from '@/shared/ui/Input';
import { CHAT_MAX_LENGTH } from '../model/types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    onSendMessage(message);
    setMessage('');
  };

  return (
    <div className="border-stroke-default bg-surface-default border-t p-2">
      <Input
        value={message}
        onChange={setMessage}
        onEnter={handleSend}
        maxLength={CHAT_MAX_LENGTH}
        placeholder="메시지 입력..."
        variant="default"
        className="text-sm"
      />
    </div>
  );
};
export default ChatInput;
