import React from 'react';
import { TrashIcon, ShareIcon } from './Icons';

interface MessageActionHeaderProps {
    onDelete: () => void;
    onForward: () => void;
}

export const MessageActionHeader: React.FC<MessageActionHeaderProps> = ({ onDelete, onForward }) => {
    return (
        <div 
            className="fixed top-0 left-0 right-0 h-[60px] bg-[#202c33] z-50 flex items-center justify-end px-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-4 text-white">
                <button 
                    onClick={onForward}
                    className="p-2 rounded-full hover:bg-white/10"
                    aria-label="Переслать сообщение"
                >
                    <ShareIcon className="text-2xl" />
                </button>
                <button 
                    onClick={onDelete}
                    className="p-2 rounded-full hover:bg-white/10"
                    aria-label="Удалить сообщение"
                >
                    <TrashIcon className="text-xl" />
                </button>
            </div>
        </div>
    );
};