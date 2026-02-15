import React, { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { XIcon } from './Icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fadeIn">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in-out;
        }
      `}</style>
      <div ref={modalRef} className="bg-[#202c33] rounded-lg shadow-xl w-full max-w-sm p-6 text-white relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white" aria-label="Закрыть">
          <XIcon className="text-2xl" />
        </button>

        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="text-gray-300 mb-6">{message}</div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-white bg-gray-600 hover:bg-gray-700 transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};