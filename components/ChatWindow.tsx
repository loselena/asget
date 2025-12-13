// Fix: Implemented the ChatWindow component structure.
import React from 'react';
import type { User, Chat, Message, LinkPreview } from '../types';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  contactUser: User;
  users: User[];
  onSendMessage: (messages: {
    content: string;
    type: Message['type'];
    caption?: string;
    linkPreview?: LinkPreview;
  }[]) => void;
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  fetchLinkPreview: (url: string) => Promise<LinkPreview | null>;
  onViewImage: (url: string) => void;
  onViewVideo: (url: string) => void;
  onDeleteMessages: (messageIds: number[]) => void;
  onReactToMessage: (messageId: number, emoji: string) => void;
  onForwardMessage: (message: Message) => void;
  showConfirm: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  currentUser,
  contactUser,
  users,
  onSendMessage,
  onBack,
  onStartCall,
  fetchLinkPreview,
  onViewImage,
  onViewVideo,
  onDeleteMessages,
  onReactToMessage,
  onForwardMessage,
  showConfirm,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#182229] bg-chat-pattern relative transform">
      <ChatHeader user={contactUser} onBack={onBack} onStartCall={onStartCall} />
      <MessageList
        messages={chat.messages}
        currentUserId={currentUser.id}
        users={users}
        onViewImage={onViewImage}
        onViewVideo={onViewVideo}
        onDeleteMessages={onDeleteMessages}
        onReactToMessage={onReactToMessage}
        onForwardMessage={onForwardMessage}
        showConfirm={showConfirm}
      />
      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={() => {}} // Placeholder for typing indicator
        fetchLinkPreview={fetchLinkPreview}
      />
    </div>
  );
};