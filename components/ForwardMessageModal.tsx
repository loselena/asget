import React, { useState, useRef, useMemo } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import type { Message, User } from '../types';
import { XIcon, SendIcon, CircleCheckIcon } from './Icons';
import { MessageBubble } from './MessageBubble';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: (contactIds: number[], comment?: string) => void;
  messageToForward: Message;
  contacts: User[];
  users: User[]; // All users to find sender info
  currentUser: User;
}

const ForwardContactItem: React.FC<{
    contact: User;
    isSelected: boolean;
    onSelect: (id: number) => void;
}> = ({ contact, isSelected, onSelect }) => {
    return (
        <div
            onClick={() => onSelect(contact.id)}
            className={`flex items-center p-3 cursor-pointer rounded-lg transition-colors duration-200 ${isSelected ? 'bg-[#00A5FE]/20' : 'hover:bg-[#182229]'}`}
        >
            <div className="relative">
                <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full mr-4" />
                {isSelected && (
                     <div className="absolute -bottom-1 -right-2 text-[#00A5FE] bg-white rounded-full">
                        <CircleCheckIcon className="text-xl" />
                    </div>
                )}
            </div>
            <h3 className="text-md font-semibold text-[#e9edef] truncate">{contact.name}</h3>
        </div>
    );
};

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  onForward,
  messageToForward,
  contacts,
  users,
  currentUser,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());
  const [comment, setComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useClickOutside(modalRef, onClose);

  const handleToggleSelection = (id: number) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleForwardClick = () => {
    if (selectedContactIds.size === 0) return;
    onForward(Array.from(selectedContactIds), comment.trim() || undefined);
  };
  
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, contacts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-[#111b21] rounded-lg shadow-xl w-full max-w-md h-[85vh] flex flex-col text-white">
        <header className="flex items-center justify-between p-4 border-b border-[#2f3b44]">
          <h2 className="text-xl font-semibold">Переслать сообщение</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon className="text-2xl" />
          </button>
        </header>

        <div className="p-2">
             <input
                type="text"
                placeholder="Поиск контактов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#202c33] rounded-lg px-4 py-2 text-sm text-[#d1d7db] placeholder:text-[#8696a0] focus:outline-none"
            />
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex flex-col gap-2">
                 {filteredContacts.map(contact => (
                    <ForwardContactItem 
                        key={contact.id}
                        contact={contact}
                        isSelected={selectedContactIds.has(contact.id)}
                        onSelect={handleToggleSelection}
                    />
                 ))}
            </div>
        </div>
        
        <div className="p-4 border-t border-[#2f3b44]">
             {/* Message Preview */}
             <div className="mb-3 p-2 border border-gray-700 rounded-lg max-h-40 overflow-hidden relative">
                <div className="opacity-60 transform scale-90 origin-top-left pointer-events-none">
                     <MessageBubble
                        message={messageToForward}
                        isSender={messageToForward.senderId === currentUser.id}
                        currentUserId={currentUser.id}
                        users={users}
                        onViewImage={() => {}}
                        // Fix: Added missing 'onViewVideo' prop to satisfy MessageBubbleProps.
                        onViewVideo={() => {}}
                        onDeleteMessage={() => {}}
                        onReactToMessage={() => {}}
                        onForwardMessage={() => {}}
                        showConfirm={() => {}}
                     />
                </div>
                 <div className="absolute inset-0 bg-gradient-to-t from-[#111b21] to-transparent"></div>
             </div>

            <div className="flex items-center gap-3">
                 <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Добавить комментарий..."
                    className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2.5 text-white placeholder:text-[#8696a0] focus:outline-none"
                />
                 <button 
                    onClick={handleForwardClick}
                    disabled={selectedContactIds.size === 0}
                    className="p-3 rounded-full bg-[#00a884] text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                 >
                    <SendIcon className="text-xl" />
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};