import React, { useState, useRef, useEffect } from 'react';
// Fix: Corrected import path for types.
import type { User } from '../types';
// Fix: Corrected import path for Icons.
import { XIcon } from './Icons';
import { useClickOutside } from '../hooks/useClickOutside';

interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onSave: (updates: Partial<Pick<User, 'name' | 'avatar'>>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentUser, onClose, onSave }) => {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, onClose);

  useEffect(() => {
    setName(currentUser.name);
    setAvatar(currentUser.avatar);
  }, [currentUser]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name: name.trim(), avatar: avatar.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-[#202c33] rounded-lg shadow-xl w-full max-w-md p-6 text-white relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XIcon className="text-2xl" />
        </button>

        <h2 className="text-2xl font-bold mb-6">Настройки профиля</h2>
        
        <div className="flex justify-center mb-6">
          <img src={avatar || `https://i.pravatar.cc/150?u=${name}`} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-2 border-gray-500" />
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="userName">Ваше имя</label>
            <input
              id="userName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full py-2 px-3 bg-[#2a3942] text-white border-2 border-[#2f3b44] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A3E0]"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="userAvatar">URL аватара</label>
            <input
              id="userAvatar"
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full py-2 px-3 bg-[#2a3942] text-white border-2 border-[#2f3b44] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A3E0]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-white bg-gray-600 hover:bg-gray-700">Отмена</button>
            <button type="submit" className="px-4 py-2 rounded-md text-white bg-[#00A3E0] hover:bg-[#0082b3]">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};