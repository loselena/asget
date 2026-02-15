import React, { useMemo, useState, useRef } from 'react';
import type { Chat, Message } from '../types';
import { XIcon, DocumentTextIcon, PlayIcon, MicIcon, TrashIcon, SingleCheckIcon } from './Icons';
import { useClickOutside } from '../hooks/useClickOutside';
import { VideoPreviewModal } from './VideoPreviewModal';

interface FileManagerModalProps {
  chats: Chat[];
  onClose: () => void;
  onViewImage: (url: string) => void;
  onDeleteMessages: (messageIds: number[]) => void;
  showConfirm: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
}

type MediaFile = {
  message: Message;
  chatId: number;
};

type MediaType = 'image' | 'video' | 'audio' | 'document';

const MediaPreview: React.FC<{ 
    file: MediaFile; 
    isSelected: boolean;
    isInSelectionMode: boolean;
    onViewImage: (url: string) => void;
    onViewVideo: (url: string) => void;
    onDelete: () => void;
    onToggleSelect: () => void;
}> = ({ file, isSelected, isInSelectionMode, onViewImage, onViewVideo, onDelete, onToggleSelect }) => {
    const { message } = file;
    
    const handleClick = () => {
        if (isInSelectionMode) {
            onToggleSelect();
        } else {
             switch (message.type) {
                case 'image': onViewImage(message.content); break;
                case 'video': onViewVideo(message.content); break;
                default: break; // Audio/Docs are handled by their own controls
            }
        }
    }

    const renderContent = () => {
        switch (message.type) {
            case 'image':
                return (
                    <>
                        <img src={message.content} alt={message.caption || 'image'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </>
                );
            case 'video': {
                const isYoutube = message.content.includes('youtube.com/embed/');

                if (isYoutube) {
                    const videoId = message.content.split('/').pop()?.split('?')[0];
                    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                    return (
                        <>
                            <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <PlayIcon className="text-white text-4xl" />
                            </div>
                        </>
                    );
                }

                // Для других видео (прямые файлы, tiktok и т.д.)
                return (
                   <>
                       <video src={`${message.content}#t=0.1`} preload="metadata" className="w-full h-full object-cover" muted playsInline />
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                           <PlayIcon className="text-white text-4xl" />
                       </div>
                   </>
               );
            }
            case 'audio':
                return (
                    <div className="w-full h-full bg-[#2a3942] p-3 flex flex-col justify-center items-center text-center">
                       <MicIcon className="text-4xl text-gray-400 mb-2"/>
                       <p className="text-xs text-gray-200 break-all line-clamp-2">Аудиосообщение</p>
                    </div>
                );
            case 'document':
                 const [fileName] = message.content.split('|');
                 return (
                     <a href={message.caption} download={fileName} className="w-full h-full bg-[#2a3942] p-3 flex flex-col justify-center items-center text-center">
                        <DocumentTextIcon className="text-4xl text-gray-400 mb-2"/>
                        <p className="text-xs text-gray-200 break-all line-clamp-2">{fileName}</p>
                     </a>
                 );
            default:
                return null;
        }
    };

    return (
        <div className="relative w-full h-32 bg-gray-700 rounded-md overflow-hidden cursor-pointer group" onClick={handleClick}>
            {renderContent()}
            {/* Selection Overlay */}
            {isSelected && (
                <div className="absolute inset-0 border-2 border-blue-500 rounded-md pointer-events-none">
                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <SingleCheckIcon className="text-white text-sm" />
                    </div>
                </div>
            )}
             {/* Single Delete Button */}
            {!isInSelectionMode && (
                 <button 
                    onClick={(e) => {
                         e.stopPropagation();
                         onDelete();
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                    aria-label="Delete file"
                 >
                    <XIcon className="text-sm" />
                 </button>
            )}
        </div>
    )
};


export const FileManagerModal: React.FC<FileManagerModalProps> = ({ chats, onClose, onViewImage, onDeleteMessages, showConfirm }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<MediaType>('image');
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
    const isConfirmingDeletion = useRef(false);

    useClickOutside(modalRef, () => {
        // Когда из этого модального окна открывается модальное окно подтверждения, любой щелчок
        // (подтверждение, отмена, оверлей) технически является "внешним" для этого компонента.
        // Мы используем ref, чтобы отследить, когда активно подтверждение, и игнорировать
        // последующий щелчок снаружи, чтобы предотвратить преждевременное закрытие этого окна.
        if (isConfirmingDeletion.current) {
            isConfirmingDeletion.current = false;
            return;
        }
        onClose();
    });

    const mediaFiles = useMemo(() => {
        const allMedia: Record<MediaType, MediaFile[]> = {
            image: [], video: [], audio: [], document: []
        };
        
        chats.forEach(chat => {
            chat.messages.forEach(message => {
                if (['image', 'video', 'document', 'audio'].includes(message.type)) {
                    allMedia[message.type as MediaType].push({ message, chatId: chat.id });
                }
            });
        });
        
        Object.keys(allMedia).forEach(key => {
            const mediaType = key as MediaType;
            allMedia[mediaType].sort((a, b) => new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime());
        });

        return allMedia;
    }, [chats]);
    
    const tabs: { key: MediaType, label: string }[] = [
        { key: 'image', label: 'Изображения' },
        { key: 'video', label: 'Видео' },
        { key: 'audio', label: 'Аудио' },
        { key: 'document', label: 'Документы' },
    ];
    
    const activeFiles = mediaFiles[activeTab];
    const isInSelectionMode = selectedMessageIds.size > 0;

    const handleToggleSelection = (messageId: number) => {
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });
    };
    
    const showDeletionConfirm = (ids: number[], message: React.ReactNode) => {
        isConfirmingDeletion.current = true;
        showConfirm(
            "Подтвердите действие",
            message,
            () => {
                onDeleteMessages(ids);
                if (selectedMessageIds.size > 0) {
                    setSelectedMessageIds(new Set());
                }
            }
        );
    };

    const handleDeleteSelected = () => {
        const count = selectedMessageIds.size;
        const confirmText = `Вы уверены, что хотите удалить ${count} элемента(ов)?`;
        showDeletionConfirm(Array.from(selectedMessageIds), confirmText);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-[#111b21] rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col text-white relative">
            <header className="flex items-center justify-between p-4 border-b border-[#2f3b44] flex-shrink-0">
                {!isInSelectionMode ? (
                    <>
                        <h2 className="text-xl font-semibold">Файлы чатов</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                          <XIcon className="text-2xl" />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setSelectedMessageIds(new Set())} className="text-gray-300 hover:text-white">Отмена</button>
                        <h2 className="text-xl font-semibold">Выбрано: {selectedMessageIds.size}</h2>
                        <button onClick={handleDeleteSelected} className="flex items-center gap-2 text-red-400 hover:text-red-300">
                           <TrashIcon /> Удалить
                        </button>
                    </>
                )}
            </header>
            
            <div className="flex border-b border-[#2f3b44] flex-shrink-0">
                {tabs.map(tab => (
                    <button 
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        disabled={isInSelectionMode}
                        className={`py-3 px-6 text-sm font-medium transition-colors ${activeTab === tab.key ? 'text-[#00a884] border-b-2 border-[#00a884]' : 'text-gray-400 hover:bg-[#202c33]'} disabled:text-gray-600 disabled:hover:bg-transparent disabled:border-b-0`}
                    >
                        {tab.label} ({mediaFiles[tab.key].length})
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeFiles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {activeFiles.map(file => (
                            <MediaPreview 
                                key={file.message.id} 
                                file={file} 
                                isSelected={selectedMessageIds.has(file.message.id)}
                                isInSelectionMode={isInSelectionMode}
                                onViewImage={onViewImage} 
                                onViewVideo={setVideoPreviewUrl}
                                onDelete={() => showDeletionConfirm([file.message.id], "Удалить файл?")}
                                onToggleSelect={() => handleToggleSelection(file.message.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Нет файлов типа "{tabs.find(t=>t.key === activeTab)?.label?.toLowerCase()}" в ваших чатах.</p>
                    </div>
                )}
            </div>
          </div>
          {videoPreviewUrl && <VideoPreviewModal videoUrl={videoPreviewUrl} onClose={() => setVideoPreviewUrl(null)} />}
        </div>
    );
};