import { useCurrentPlayer } from '@/entities/gameRoom';
import { cn } from '@/shared/lib/classNames';
import { UserAvatar } from '@/shared/ui';
import type { ChatMessage as ChatMessageType } from '../model/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const currentPlayer = useCurrentPlayer();
  const isMe = currentPlayer?.profileId === message.profileId;
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="bg-surface-muted text-content-secondary rounded-full px-3 py-1 text-base">
          {message.message}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn('mb-3 flex w-full', isMe ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'flex max-w-[80%] gap-2',
          isMe ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        {/* 아바타 */}
        <div className="shrink-0">
          <UserAvatar
            name={message.profileId || message.nickname || ''}
            className="h-8 w-8"
          />
        </div>

        {/* 메시지 내용 */}
        <div
          className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
        >
          {!isMe && (
            <span className="text-content-secondary mb-1 text-lg font-medium">
              {message.nickname}
            </span>
          )}
          <div
            className={cn(
              'rounded-xl px-2 py-1 text-lg wrap-break-word',
              isMe
                ? 'bg-brand-primary rounded-tr-sm text-white'
                : 'bg-surface-muted text-content-primary rounded-tl-sm',
            )}
          >
            {message.message}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChatMessage;
