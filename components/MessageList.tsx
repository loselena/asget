// Fix: Implemented the MessageList component to display chat messages.
import React, { useRef, useLayoutEffect } from 'react';
import type { Message, User } from '../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  users: User[];
  onViewImage: (url: string) => void;
  onViewVideo: (url: string) => void;
  onDeleteMessages: (messageIds: number[]) => void;
  onReactToMessage: (messageId: number, emoji: string) => void;
  onForwardMessage: (message: Message) => void;
  showConfirm: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, users, onViewImage, onViewVideo, onDeleteMessages, onReactToMessage, onForwardMessage, showConfirm }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const isNewDay = (current: Message, previous?: Message): boolean => {
    if (!previous) return true;
    const currentDate = new Date(current.timestamp).toDateString();
    const previousDate = new Date(previous.timestamp).toDateString();
    return currentDate !== previousDate;
  };
  
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
  
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="relative flex-1 overflow-y-auto p-5 bg-transparent custom-scrollbar">
      <div className="flex flex-col space-y-1">
        {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const showDateHeader = isNewDay(message, previousMessage);
            return (
                <React.Fragment key={message.id}>
                    {showDateHeader && (
                        <div className="text-center text-xs text-gray-400 my-2">
                            <span className="bg-[#1f2c33] px-2 py-1 rounded-md">{formatDate(message.timestamp)}</span>
                        </div>
                    )}
                    <MessageBubble
                        message={message}
                        isSender={message.senderId === currentUserId}
                        currentUserId={currentUserId}
                        users={users}
                        onViewImage={onViewImage}
                        onViewVideo={onViewVideo}
                        onDeleteMessage={(messageId) => onDeleteMessages([messageId])}
                        onReactToMessage={onReactToMessage}
                        onForwardMessage={onForwardMessage}
                        showConfirm={showConfirm}
                    />
                </React.Fragment>
            )
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};