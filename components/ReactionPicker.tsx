import React from 'react';
import { PlusIcon } from './Icons';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onAddReaction: () => void;
}

const commonReactions = ['👍', '❤️', '😂', '😯', '😢', '🙏'];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect, onAddReaction }) => {
  return (
    <div className="bg-[#2a3942] rounded-full shadow-lg p-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {commonReactions.map(emoji => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="text-2xl p-1 rounded-full hover:bg-[#374248] transition-transform transform hover:scale-125 focus:outline-none"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <div className="w-px h-6 bg-gray-600 mx-1"></div>
       <button
          onClick={onAddReaction}
          className="text-lg p-2 rounded-full text-gray-300 hover:bg-[#374248] transition-transform transform hover:scale-110 focus:outline-none"
          aria-label="Добавить другую реакцию"
        >
          <PlusIcon />
        </button>
    </div>
  );
};