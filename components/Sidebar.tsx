import React, { useMemo, useState, useRef } from 'react';
// Fix: Corrected import path for types.
import type { User, Chat } from '../types';
// Fix: Corrected import path for Icons.
import { SettingsIcon, UserPlusIcon, FolderIcon, SearchIcon, MoreVertIcon } from './Icons';
import { useClickOutside } from '../hooks/useClickOutside';

interface SidebarProps {
  currentUser: User;
  chats: Chat[];
  users: User[];
  onSelectChat: (chatId: number) => void;
  activeChatId: number | null;
  onAddContact: () => void;
  onOpenSettings: () => void;
  onOpenFileManager: () => void;
}

const ChatListItem: React.FC<{
    chat: Chat;
    contact: User | undefined;
    isActive: boolean;
    onSelect: () => void;
}> = ({ chat, contact, isActive, onSelect }) => {
    if (!contact) return null;

    const lastMessage = chat.messages[chat.messages.length - 1];
    const unreadCount = chat.unreadCount || 0;

    const truncate = (text: string, length: number) => {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        return date.toLocaleDateString();
    };

    return (
        <div
            onClick={onSelect}
            className={`flex items-center p-3 cursor-pointer transition-colors duration-200 ${isActive ? 'bg-[#2a3942]' : 'hover:bg-[#182229]'}`}
        >
            <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full mr-4" />
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold text-[#e9edef] truncate">{contact.name}</h3>
                    {lastMessage && <p className={`text-xs ${unreadCount > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>{formatTimestamp(lastMessage.timestamp)}</p>}
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-[#8696a0] truncate">{lastMessage ? truncate(lastMessage.content, 30) : 'Нет сообщений'}</p>
                    {unreadCount > 0 && <span className="bg-[#00a884] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
                </div>
            </div>
        </div>
    );
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  chats,
  users,
  onSelectChat,
  activeChatId,
  onAddContact,
  onOpenSettings,
  onOpenFileManager
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useClickOutside(menuRef, () => setMenuOpen(false));

    const chatWithContactDetails = useMemo(() => {
        return chats.map(chat => {
            const contactId = chat.userIds.find(id => id !== currentUser.id);
            const contact = users.find(u => u.id === contactId);
            return { chat, contact };
        }).sort((a, b) => {
            const lastMsgA = a.chat.messages[a.chat.messages.length - 1];
            const lastMsgB = b.chat.messages[b.chat.messages.length - 1];
            if (!lastMsgA) return 1;
            if (!lastMsgB) return -1;
            return new Date(lastMsgB.timestamp).getTime() - new Date(lastMsgA.timestamp).getTime();
        });
    }, [chats, users, currentUser.id]);

    const filteredChats = useMemo(() => {
        if (!searchTerm) return chatWithContactDetails;
        return chatWithContactDetails.filter(({ contact }) =>
            contact?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, chatWithContactDetails]);

    return (
        <div className="bg-[#111b21] h-full flex flex-col border-r border-[#2f3b44]">
            {/* Header */}
            <header className="flex items-center justify-between p-3 h-[60px] bg-[#202c33]">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full cursor-pointer" onClick={onOpenSettings} />
                <div className="flex items-center space-x-2 text-[#d1d7db]">
                    <button onClick={onAddContact} className="p-2 rounded-full hover:bg-[#374248]"><UserPlusIcon className="text-xl" /></button>
                    
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-[#374248]">
                            <MoreVertIcon className="text-2xl" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#233138] rounded-md shadow-lg z-10 py-1">
                                <button
                                    onClick={() => { onOpenFileManager(); setMenuOpen(false); }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-[#d1d7db] hover:bg-[#182229]"
                                >
                                    <FolderIcon className="mr-3 text-lg" />
                                    Файлы
                                </button>
                                <button
                                    onClick={() => { onOpenSettings(); setMenuOpen(false); }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-[#d1d7db] hover:bg-[#182229]"
                                >
                                    <SettingsIcon className="mr-3 text-lg" />
                                    Настройки
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Search */}
            <div className="p-2 bg-[#111b21] border-b border-[#2f3b44]">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="text-[#8696a0] w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Поиск или новый чат"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#202c33] rounded-lg pl-10 pr-4 py-2 text-sm text-[#d1d7db] placeholder:text-[#8696a0] focus:outline-none"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredChats.map(({ chat, contact }) => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        contact={contact}
                        isActive={chat.id === activeChatId}
                        onSelect={() => onSelectChat(chat.id)}
                    />
                ))}
            </div>
        </div>
    );
};