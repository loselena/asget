
// Fix: Added full type definitions for the application.
export interface User {
  id: number;
  uid: string; // Firebase Auth UID
  name: string;
  avatar: string;
  isOnline: boolean;
  contacts: number[]; // Array of user IDs (number format for compatibility)
  publicKey?: string;
  privateKey?: string; // Should be handled with care
}

export type MessageType = 'text' | 'image' | 'gif' | 'sticker' | 'document' | 'video' | 'audio' | 'call';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Reaction {
  emoji: string;
  userIds: number[];
}

export interface Message {
  id: number;
  content: string;
  timestamp: string;
  senderId: number;
  type: MessageType;
  status: MessageStatus;
  caption?: string;
  linkPreview?: LinkPreview;
  callDuration?: string; // e.g., "02:15"
  reactions?: Reaction[];
  forwardedFrom?: {
    name: string;
  };
}

export interface Chat {
  id: number;
  uid?: string; // Firestore Document ID
  userIds: number[];
  messages: Message[];
  unreadCount?: number;
  lastMessageTimestamp?: string; // For sorting
}

export interface Call {
  user: User;
  type: 'voice' | 'video';
  roomId?: string; // ID for signaling
  isIncoming?: boolean;
  offerPayload?: any; // WebRTC Session Description Offer
}

export interface UserInvitePayload {
  id: number;
  name: string;
  avatar: string;
  publicKey?: string;
  isOnline?: boolean;
}

export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  videoWidth?: number;
  videoHeight?: number;
}

export interface SignalPayload {
    id?: number; // DB ID needed for deletion
    type: 'offer' | 'answer' | 'candidate';
    payload: any;
    senderId: number;
    targetId: number;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string; // URL for the pack's icon
  stickers: string[]; // Array of sticker URLs
}
