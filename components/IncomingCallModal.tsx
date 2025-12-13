
import React from 'react';
import type { User } from '../types';
import { PhoneIcon, PhoneHangupIcon } from './Icons';

interface IncomingCallModalProps {
  caller: User;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ caller, onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#202c33] rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center flex flex-col items-center">
        
        <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#00A3E0] rounded-full blur-xl opacity-20 animate-pulse"></div>
            <img 
                src={caller.avatar} 
                alt={caller.name} 
                className="w-24 h-24 rounded-full border-4 border-[#2f3b44] relative z-10 object-cover" 
            />
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">{caller.name}</h2>
        <p className="text-[#8696a0] mb-8 animate-pulse">Входящий видеозвонок...</p>

        <div className="flex items-center justify-center gap-8 w-full">
          <div className="flex flex-col items-center gap-2">
              <button 
                onClick={onDecline}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-700 transition-transform active:scale-95"
              >
                <PhoneHangupIcon className="text-2xl" />
              </button>
              <span className="text-xs text-gray-400">Отклонить</span>
          </div>

          <div className="flex flex-col items-center gap-2">
              <button 
                onClick={onAccept}
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-green-600 transition-transform active:scale-95 animate-bounce"
              >
                <PhoneIcon className="text-2xl" />
              </button>
              <span className="text-xs text-gray-400">Принять</span>
          </div>
        </div>
      </div>
    </div>
  );
};
