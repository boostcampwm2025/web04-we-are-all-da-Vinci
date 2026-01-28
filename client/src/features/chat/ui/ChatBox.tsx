import { cn } from '@/shared/lib';
import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../model/types';
import ChatInput from './ChatInput';
import ChatMessageItem from './ChatMessage';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  className?: string;
}

const ChatBox = ({ messages, onSendMessage, className = '' }: ChatBoxProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 오면 자동으로 스크롤 하단으로 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={cn('card flex h-full flex-col', className)}>
      {/* 채팅 헤더 */}
      <div className="border-stroke-strong border-b-2 px-4 py-3">
        <h3 className="font-handwriting flex justify-center text-lg font-bold">
          {'채팅'}
        </h3>
      </div>

      {/* 메시지 리스트  */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent h-full w-full overflow-y-auto p-4"
        >
          <div className="flex min-h-full flex-col justify-end">
            {messages.map((msg, idx) => (
              <ChatMessageItem key={`${msg.timestamp}-${idx}`} message={msg} />
            ))}
          </div>
        </div>
      </div>

      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
};
export default ChatBox;
