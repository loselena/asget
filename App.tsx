
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AddContactModal } from './components/AddContactModal';
import { SettingsModal } from './components/SettingsModal';
import { CallScreen } from './components/CallScreen';
import { FileManagerModal } from './components/FileManagerModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ForwardMessageModal } from './components/ForwardMessageModal';
import { VideoPreviewModal } from './components/VideoPreviewModal';
import { LinkPreviewService } from './services/linkPreviewService';
import type { User, Chat, Message, Call, UserInvitePayload, LinkPreview, SignalPayload } from './types';
import { AppService, stringToId } from './services/AppService';
import { isSupabaseInitialized } from './services/supabase';
import { mockUsers, mockChats } from './services/mockData';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
}

interface ForwardingState {
    isOpen: boolean;
    message: Message | null;
}

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [currentCall, setCurrentCall] = useState<Call | null>(null);
    const [activeChatMessages, setActiveChatMessages] = useState<Message[]>([]);
    
    // Modal states
    const [isAddContactOpen, setAddContactOpen] = useState(false);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isFileManagerOpen, setFileManagerOpen] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [forwardingState, setForwardingState] = useState<ForwardingState>({ isOpen: false, message: null });

    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    // --- App Initialization ---
    useEffect(() => {
        // If we are in "Mock Mode" (no supabase keys), load from storage
        if (!isSupabaseInitialized) {
            const sessionUserJson = sessionStorage.getItem('currentUser');
            if (sessionUserJson) {
                const user = JSON.parse(sessionUserJson) as User;
                setCurrentUser(user);
                const storedUsers = localStorage.getItem('users');
                setUsers(storedUsers ? JSON.parse(storedUsers) : []);
                const storedChats = localStorage.getItem(`chats-${user.id}`);
                setChats(storedChats ? JSON.parse(storedChats) : []);
            }
        }
        
        setIsLoading(false);
    }, []);

    // --- Supabase Subscriptions ---
    useEffect(() => {
        if (!currentUser || !isSupabaseInitialized) return;

        // 1. Subscribe to User Profile Updates
        const unsubUser = AppService.subscribeToUser(currentUser.uid, (updatedUser) => {
            setCurrentUser(updatedUser);
            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        });

        // 2. Subscribe to All Users (to see contacts status)
        const unsubAllUsers = AppService.subscribeToAllUsers((fetchedUsers) => {
            setUsers(fetchedUsers);
        });

        // 3. Subscribe to Chats list
        const unsubChats = AppService.subscribeToChats(currentUser.id, (fetchedChats) => {
            setChats(fetchedChats);
        });
        
        // 4. Subscribe to Incoming Call Signals (OFFER only)
        // We only listen for 'offer' here to start the call. 
        // 'answer' and 'candidate' are handled within CallScreen.tsx
        const unsubSignals = AppService.subscribeToSignals(currentUser.id, (signal) => {
            console.log("App.tsx received signal:", signal.type);
            if (signal.type === 'offer') {
                const caller = users.find(u => u.id === signal.senderId);
                if (caller) {
                    // Temporarily store signal ID to delete it after response
                    const signalId = signal.id;
                    const confirmCall = window.confirm(`Входящий звонок от ${caller.name}. Принять?`);
                    if (confirmCall) {
                        setCurrentCall({ 
                            user: caller, 
                            type: 'video', 
                            isIncoming: true, 
                            roomId: signal.payload.roomId,
                            offerPayload: signal.payload.offer // Pass the WebRTC offer
                        });
                        // We delete the offer signal now that we've accepted it locally
                        if (signalId) AppService.deleteSignal(signalId);
                    } else {
                        // User rejected
                        if (signalId) AppService.deleteSignal(signalId);
                    }
                } else {
                    console.warn("Received offer from unknown user ID:", signal.senderId);
                }
            }
        });

        return () => {
            unsubUser();
            unsubAllUsers();
            unsubChats();
            unsubSignals();
        };
    }, [currentUser?.uid, users]); // Depend on users to find caller info

    // --- Active Chat Messages Subscription ---
    useEffect(() => {
        if (!activeChatId || !isSupabaseInitialized || !chats) return;
        
        const chat = chats.find(c => c.id === activeChatId);
        if (chat && chat.uid) {
            const unsubMessages = AppService.subscribeToChatMessages(chat.uid, (messages) => {
                setActiveChatMessages(messages);
                // Also update the global chats state to reflect these messages (for Sidebar previews)
                setChats(prevChats => prevChats.map(c => 
                    c.id === activeChatId ? { ...c, messages } : c
                ));
            });
            return () => unsubMessages();
        }
    }, [activeChatId, isSupabaseInitialized, chats]);


    // --- Derived State ---
    const activeChat = useMemo(() => {
        const chat = chats.find(c => c.id === activeChatId) || null;
        if (chat && activeChatMessages.length > 0 && isSupabaseInitialized) {
            return { ...chat, messages: activeChatMessages };
        }
        return chat;
    }, [activeChatId, chats, activeChatMessages]);
    
    const contactUser = useMemo(() => {
        if (!activeChat || !currentUser) return null;
        const contactId = activeChat.userIds.find(id => id !== currentUser.id);
        return users.find(u => u.id === contactId) || null;
    }, [activeChat, currentUser, users]);

    const userContacts = useMemo(() => {
        if (!currentUser || !chats) return [];
        const contactIds = new Set<number>();
        chats.forEach(chat => {
            const contactId = chat.userIds.find(id => id !== currentUser.id);
            if (contactId) contactIds.add(contactId);
        });
        return users.filter(user => contactIds.has(user.id));
    }, [currentUser, chats, users]);

    // --- Handlers ---

    const showConfirm = (title: string, message: React.ReactNode, onConfirm: () => void) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
    const handleConfirm = () => { confirmModal.onConfirm(); closeConfirm(); }

    const handleLogin = async (name: string): Promise<void> => {
        // --- Supabase Mode ---
        if (isSupabaseInitialized) {
            try {
                // In this simplified flow, we generate credentials/records based on name
                const { user: authUser } = await AppService.signIn();
                // Pass a placeholder UID if not using strict Auth, AppService handles it
                const user = await AppService.createOrUpdateUser(authUser.uid, name);
                setCurrentUser(user);
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            } catch (error) {
                console.error("Login failed:", error);
                alert("Ошибка входа. Проверьте консоль.");
            }
            return;
        }

        // --- Demo/Mock Mode ---
        const isDemo = name.toLowerCase() === 'alice';
        const storedUsersRaw = localStorage.getItem('users');
        const initialUsers: User[] = (isDemo && !storedUsersRaw) ? mockUsers : JSON.parse(storedUsersRaw || '[]');
        
        let user: User | undefined;
        if (isDemo) {
            user = initialUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
        } else {
            const userId = stringToId(name);
            user = initialUsers.find(u => u.id === userId);
        }
    
        if (user) {
            user = { ...user, name, isOnline: true };
        } else {
            const userId = stringToId(name);
            user = { id: userId, uid: `local-${userId}`, name, avatar: `https://robohash.org/${name}.png?set=set4`, isOnline: true, contacts: [] };
            initialUsers.push(user);
        }
        
        const userChats = isDemo ? mockChats : JSON.parse(localStorage.getItem(`chats-${user.id}`) || '[]');
        setUsers(initialUsers.map(u => u.id === user!.id ? user! : u));
        setChats(userChats);
        setCurrentUser(user);
        localStorage.setItem('users', JSON.stringify(initialUsers));
        if (isDemo) localStorage.setItem(`chats-${user.id}`, JSON.stringify(userChats));
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    };
    
    const handleSelectChat = async (chatId: number) => {
        setActiveChatId(chatId);
        if (!currentUser) return;
        
        // Mark as read in Supabase
        if (isSupabaseInitialized) {
            const chat = chats.find(c => c.id === chatId);
            if (chat && chat.uid && (chat.unreadCount || 0) > 0) {
                await AppService.markChatRead(chat.uid, currentUser.id);
            }
        } else {
            // Local Storage fallback
            const updatedChats = chats.map(chat => {
                if (chat.id === chatId && (chat.unreadCount ?? 0) > 0) {
                    const updatedMessages = chat.messages.map(msg => 
                        msg.senderId !== currentUser.id && msg.status !== 'read' ? {...msg, status: 'read' as const} : msg
                    );
                    return { ...chat, messages: updatedMessages, unreadCount: 0 };
                }
                return chat;
            });
            setChats(updatedChats);
            localStorage.setItem(`chats-${currentUser.id}`, JSON.stringify(updatedChats));
        }
    };

    const handleSendMessage = async (
        messages: {
          content: string,
          type: Message['type'],
          caption?: string,
          linkPreview?: LinkPreview,
          file?: File
        }[]
      ) => {
        if (!currentUser || !contactUser || messages.length === 0) return;
    
        if (isSupabaseInitialized) {
            const chat = chats.find(c => c.id === activeChatId);
            if (chat && chat.uid) {
                // Upload files first and replace blob URLs with public URLs
                for (const msgPayload of messages) {
                    let content = msgPayload.content;
                    let caption = msgPayload.caption;

                    if (msgPayload.file) {
                        try {
                           const publicUrl = await AppService.uploadFile(msgPayload.file);
                           if (publicUrl) {
                               // Adjust content/caption based on type
                               if (msgPayload.type === 'document') {
                                   caption = publicUrl;
                                   // Keep content as "Name|Size" for metadata, update link in caption
                               } else {
                                   content = publicUrl;
                               }
                           } else {
                               alert(`Не удалось загрузить файл: ${msgPayload.file.name}. Проверьте настройки Storage.`);
                               continue;
                           }
                        } catch (e) {
                            console.error("Upload failed", e);
                            continue;
                        }
                    }

                    const newMessage: Message = {
                        id: 0, // Assigned by DB
                        content: content,
                        type: msgPayload.type,
                        caption: caption,
                        linkPreview: msgPayload.linkPreview,
                        timestamp: new Date().toISOString(),
                        senderId: currentUser.id,
                        status: 'sent' as const,
                        forwardedFrom: undefined
                    };

                    await AppService.sendMessage(chat.uid, newMessage);
                }
            }
        } else {
            // Local Storage fallback (Mock Mode)
            const newMessagesRaw: Message[] = messages.map((msg, index) => ({
                id: Date.now() + index,
                content: msg.content,
                type: msg.type,
                caption: msg.caption,
                linkPreview: msg.linkPreview,
                timestamp: new Date().toISOString(),
                senderId: currentUser!.id,
                status: 'sent' as const,
            }));

            const updatedChats = chats.map(chat =>
              chat.id === activeChatId
                ? { ...chat, messages: [...chat.messages, ...newMessagesRaw] }
                : chat
            );
            setChats(updatedChats);
            localStorage.setItem(`chats-${currentUser.id}`, JSON.stringify(updatedChats));
        }
    };
    
    const handleAddContact = async (payload: UserInvitePayload): Promise<boolean> => {
        if (!currentUser) return false;
        if (payload.id === currentUser.id) { alert("Вы не можете добавить себя в контакты."); return false; }
        if (currentUser.contacts.includes(payload.id)) { alert("Этот пользователь уже есть в ваших контактах."); return false; }
        
        if (isSupabaseInitialized) {
            try {
                await AppService.addContact(currentUser, payload.id);
                alert(`Контакт ${payload.name} успешно добавлен!`);
                return true;
            } catch (e: any) {
                alert(e.message || "Ошибка добавления контакта.");
                return false;
            }
        }

        // --- Local Storage Fallback ---
        let contactExists = false;
        const updatedUsers = users.map(u => {
            if (u.id === currentUser.id) return { ...u, contacts: [...new Set([...u.contacts, payload.id])] };
            if (u.id === payload.id) {
                contactExists = true;
                return { ...u, contacts: [...new Set([...u.contacts, currentUser.id])] };
            }
            return u;
        });
        if (!contactExists) {
            updatedUsers.push({ ...payload, contacts: [currentUser.id], id: payload.id, uid: `local-${payload.id}`, isOnline: payload.isOnline ?? false});
        }
        setUsers(updatedUsers);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        
        const chatExists = chats.some(c => c.userIds.includes(currentUser.id) && c.userIds.includes(payload.id));
        if (!chatExists) {
            const newChat: Chat = { id: Date.now(), userIds: [currentUser.id, payload.id], messages: [] };
            const updatedChats = [newChat, ...chats];
            setChats(updatedChats);
            localStorage.setItem(`chats-${currentUser.id}`, JSON.stringify(updatedChats));
        }

        alert(`Контакт ${payload.name} успешно добавлен!`);
        return true;
    };

    const handleSaveSettings = async (updates: Partial<Pick<User, 'name' | 'avatar'>>) => {
        if (!currentUser) return;
        
        if (isSupabaseInitialized) {
            // We pass currentUser.name because in this flow we generate ID from name, 
            // but updating name might change ID logic if we weren't careful. 
            // In the AppService update, we rely on UID, so it's fine.
            const updatedUser = await AppService.createOrUpdateUser(currentUser.uid, updates.name || currentUser.name);
            setCurrentUser({ ...currentUser, ...updates }); 
            setSettingsOpen(false);
            return;
        }

        const updatedUser = { ...currentUser, ...updates };
        setCurrentUser(updatedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
        setUsers(updatedUsers);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        setSettingsOpen(false);
    };

    const handleStartCall = (type: 'voice' | 'video') => {
        if (contactUser && currentUser) {
            const call: Call = { user: contactUser, type, roomId: `${currentUser.id}-${Date.now()}` };
            setCurrentCall(call);
            // NOTE: We don't send the signal here anymore. 
            // CallScreen will handle the WebRTC Offer generation and sending.
        }
    };
    
    const handleDeleteMessages = async (messageIds: number[]) => {
        if(!currentUser) return;

        if (isSupabaseInitialized) {
            const chat = chats.find(c => c.id === activeChatId);
            if (chat && chat.uid) {
                const messagesToDelete = activeChatMessages.filter(m => messageIds.includes(m.id));
                for (const msg of messagesToDelete) {
                    if ((msg as any)._docId) {
                         // _docId holds the DB ID
                        await AppService.deleteMessage(chat.uid, (msg as any)._docId);
                    }
                }
            }
        } else {
             const updatedChats = chats.map(chat => ({
                ...chat,
                messages: chat.messages.filter(msg => !messageIds.includes(msg.id))
            }));
            setChats(updatedChats);
            localStorage.setItem(`chats-${currentUser.id}`, JSON.stringify(updatedChats));
        }
    };

    const handleReactToMessage = async (messageId: number, emoji: string) => {
        if (!currentUser || activeChatId === null) return;

        if (isSupabaseInitialized) {
             const chat = chats.find(c => c.id === activeChatId);
             if (chat && chat.uid) {
                 const msg = activeChatMessages.find(m => m.id === messageId);
                 if (msg && (msg as any)._docId) {
                     await AppService.addReaction(chat.uid, (msg as any)._docId, { emoji, userId: currentUser.id });
                 }
             }
        } else {
            const updatedChats = chats.map(chat => {
                if (chat.id !== activeChatId) return chat;
                const updatedMessages = chat.messages.map(message => {
                    if (message.id !== messageId) return message;
                    const reactions = message.reactions ? JSON.parse(JSON.stringify(message.reactions)) : [];
                    let reactionIndex = reactions.findIndex((r: any) => r.emoji === emoji);
                    
                    if (reactionIndex > -1) {
                        const userIndex = reactions[reactionIndex].userIds.indexOf(currentUser.id);
                        if (userIndex > -1) {
                            reactions[reactionIndex].userIds.splice(userIndex, 1);
                        } else {
                            reactions[reactionIndex].userIds.push(currentUser.id);
                        }
                        if (reactions[reactionIndex].userIds.length === 0) reactions.splice(reactionIndex, 1);
                    } else {
                        reactions.push({ emoji, userIds: [currentUser.id] });
                    }
                    return { ...message, reactions };
                });
                return { ...chat, messages: updatedMessages };
            });
            setChats(updatedChats);
            localStorage.setItem(`chats-${currentUser.id}`, JSON.stringify(updatedChats));
        }
    };

    const handleStartForwarding = (message: Message) => setForwardingState({ isOpen: true, message: message });

    const handleConfirmForward = async (contactIds: number[], comment?: string) => {
        if (!currentUser || !forwardingState.message) return;
        
        const originalMessage = forwardingState.message;
        const originalSender = users.find(u => u.id === originalMessage.senderId);

        // Prepare message object
        const createForwardedMessage = (counterOffset: number): Message => ({
             ...originalMessage,
             id: Date.now() + counterOffset,
             senderId: currentUser!.id,
             timestamp: new Date().toISOString(),
             status: 'sent',
             caption: originalMessage.type !== 'text' ? comment : originalMessage.caption,
             reactions: [],
             linkPreview: originalMessage.type === 'text' ? originalMessage.linkPreview : undefined,
             forwardedFrom: { name: originalSender?.name || 'Неизвестный' },
             content: (originalMessage.type === 'text' && comment) ? `${originalMessage.content}\n\n${comment}` : originalMessage.content
        });

        if (isSupabaseInitialized) {
            let counter = 0;
            for (const contactId of contactIds) {
                // Find chat ID by checking userIds
                const chat = chats.find(c => c.userIds.includes(currentUser.id) && c.userIds.includes(contactId));
                if (chat && chat.uid) {
                    await AppService.sendMessage(chat.uid, createForwardedMessage(counter++));
                }
            }
        } else {
            let updatedChats = [...chats];
            let messageCounter = 0;
            contactIds.forEach(contactId => {
                const chatIndex = updatedChats.findIndex(c => c.userIds.includes(currentUser!.id) && c.userIds.includes(contactId));
                if (chatIndex !== -1) {
                    updatedChats[chatIndex] = {
                        ...updatedChats[chatIndex],
                        messages: [...updatedChats[chatIndex].messages, createForwardedMessage(messageCounter++)]
                    };
                }
            });
            setChats(updatedChats);
            localStorage.setItem(`chats-${currentUser.id}`, JSON.stringify(updatedChats));
        }
        setForwardingState({ isOpen: false, message: null });
    };


    if (isLoading) {
        return <div className="bg-[#111b21] h-screen w-screen flex items-center justify-center text-white">Загрузка...</div>;
    }
    
    if (!currentUser) {
        return <Auth onLogin={handleLogin} />;
    }

    return (
        <div className="flex h-screen w-screen bg-gray-900 text-white font-sans overflow-hidden">
            <div className={`flex-shrink-0 w-full md:w-[30%] lg:w-[30%] xl:w-[25%] md:max-w-sm ${activeChatId !== null ? 'hidden md:block' : 'block'}`}>
                <Sidebar
                    currentUser={currentUser}
                    chats={chats}
                    users={users}
                    onSelectChat={handleSelectChat}
                    activeChatId={activeChatId}
                    onAddContact={() => setAddContactOpen(true)}
                    onOpenSettings={() => setSettingsOpen(true)}
                    onOpenFileManager={() => setFileManagerOpen(true)}
                />
            </div>
            
            <main className={`flex-1 flex-col ${activeChatId !== null ? 'flex' : 'hidden md:flex'}`}>
                {activeChat && contactUser ? (
                    <ChatWindow
                        key={activeChatId}
                        chat={activeChat}
                        currentUser={currentUser}
                        contactUser={contactUser}
                        users={users}
                        onSendMessage={handleSendMessage}
                        onBack={() => setActiveChatId(null)}
                        onStartCall={handleStartCall}
                        fetchLinkPreview={LinkPreviewService.fetchLinkPreview}
                        onViewImage={setImagePreviewUrl}
                        onViewVideo={setVideoPreviewUrl}
                        onDeleteMessages={handleDeleteMessages}
                        onReactToMessage={handleReactToMessage}
                        onForwardMessage={handleStartForwarding}
                        showConfirm={showConfirm}
                    />
                ) : (
                    <div className="hidden md:flex flex-1">
                        <WelcomeScreen />
                    </div>
                )}
            </main>
            
            {isAddContactOpen && <AddContactModal currentUser={currentUser} onClose={() => setAddContactOpen(false)} onAddContact={handleAddContact} />}
            {isSettingsOpen && <SettingsModal currentUser={currentUser} onClose={() => setSettingsOpen(false)} onSave={handleSaveSettings} />}
            {isFileManagerOpen && <FileManagerModal chats={chats} onClose={() => setFileManagerOpen(false)} onViewImage={setImagePreviewUrl} onDeleteMessages={handleDeleteMessages} showConfirm={showConfirm} />}
            {currentCall && <CallScreen currentUser={currentUser!} call={currentCall} onEndCall={() => setCurrentCall(null)} />}
            {imagePreviewUrl && <ImagePreviewModal imageUrl={imagePreviewUrl} onClose={() => setImagePreviewUrl(null)} />}
            {videoPreviewUrl && <VideoPreviewModal videoUrl={videoPreviewUrl} onClose={() => setVideoPreviewUrl(null)} />}
             {forwardingState.isOpen && forwardingState.message && (
                <ForwardMessageModal
                    isOpen={forwardingState.isOpen}
                    onClose={() => setForwardingState({ isOpen: false, message: null })}
                    onForward={handleConfirmForward}
                    messageToForward={forwardingState.message}
                    contacts={userContacts}
                    users={users}
                    currentUser={currentUser}
                />
            )}
            
            <ConfirmModal
              isOpen={confirmModal.isOpen}
              onClose={closeConfirm}
              onConfirm={handleConfirm}
              title={confirmModal.title}
              message={confirmModal.message}
              confirmText="Удалить"
              cancelText="Отмена"
            />
        </div>
    );
};

export default App;
