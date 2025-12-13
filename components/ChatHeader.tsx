import React from 'react';
// Fix: Corrected import path for types.
import type { User } from '../types';
// Fix: Corrected import path for Icons.
import { PhoneIcon, VideoIcon, ArrowLeftIcon, SearchIcon, MoreVertIcon } from './Icons';

interface ChatHeaderProps {
  user: User;
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ user, onBack, onStartCall, className }) => {
  return (
    <div className={`flex items-center justify-between p-3 h-[60px] border-b border-[#2f3b44] bg-[#202c33] relative z-10 ${className}`}>
      <div className="flex items-center min-w-0">
        <button onClick={onBack} className="mr-2 md:hidden p-2 rounded-full hover:bg-[#374248]">
          <ArrowLeftIcon className="text-2xl text-[#d1d7db]" />
        </button>
        <div className="relative flex-shrink-0 cursor-pointer">
          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
        </div>
        <div className="ml-3 min-w-0 cursor-pointer">
          <h2 className="text-md font-semibold text-[#e9edef] truncate">{user.name}</h2>
          <p className="text-xs text-[#8696a0]">{user.isOnline ? 'в сети' : 'не в сети'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        <button onClick={() => onStartCall('video')} className="p-2 rounded-full hover:bg-[#374248]">
          <VideoIcon className="text-2xl text-[#d1d7db]" />
        </button>
        <button onClick={() => onStartCall('voice')} className="p-2 rounded-full hover:bg-[#374248]">
          <PhoneIcon className="text-2xl text-[#d1d7db]" />
        </button>
         <button className="hidden md:block p-2 rounded-full hover:bg-[#374248]">
          <SearchIcon className="text-xl text-[#d1d7db]" />
        </button>
        <button className="p-2 rounded-full hover:bg-[#374248]">
          <MoreVertIcon className="text-2xl text-[#d1d7db]" />
        </button>
      </div>
    </div>
  );
};
