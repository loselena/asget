import React, { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

interface ReactionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export const ReactionBottomSheet: React.FC<ReactionBottomSheetProps> = ({ isOpen, onClose, onDelete }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  useClickOutside(sheetRef, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center transition-opacity duration-300 animate-fadeIn" onClick={onClose}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-in-out forwards; }
      `}</style>
      <div
        ref={sheetRef}
        className="bg-[#202c33] w-full max-w-md rounded-t-lg p-4 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-gray-300 mb-4 text-center">Удалить реакцию?</p>
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full text-center px-4 py-3 text-red-400 font-semibold hover:bg-[#2a3942] rounded-lg transition-colors"
        >
          Удалить
        </button>
      </div>
    </div>
  );
};