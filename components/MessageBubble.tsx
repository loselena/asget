
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import EmojiPicker, { EmojiClickData, Theme, Categories } from 'emoji-picker-react';
import type { Message, User, LinkPreview } from '../types';
import { DoubleCheckIcon, SingleCheckIcon, DocumentTextIcon, PlayIcon, PauseIcon, XIcon, EmojiIcon, ShareIcon, PlusIcon, PhotoIcon } from './Icons';
import { LinkPreviewCard } from './LinkPreviewCard';
import { useClickOutside } from '../hooks/useClickOutside';
import { ReactionPicker } from './ReactionPicker';
import { ReactionBottomSheet } from './ReactionBottomSheet';
import { MessageActionHeader } from './MessageActionHeader';

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  currentUserId: number;
  users: User[];
  onViewImage: (url: string) => void;
  onViewVideo: (url: string) => void;
  onDeleteMessage: (messageId: number) => void;
  onReactToMessage: (messageId: number, emoji: string) => void;
  onForwardMessage: (message: Message) => void;
  showConfirm: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
}

/**
 * A component that formats message text, making URLs clickable and improving their wrapping.
 * It finds URLs, wraps them in `<a>` tags, and inserts zero-width spaces at sensible break points
 * (like after '/', '?', '&', etc.), mimicking the behavior of apps like WhatsApp.
 */
const FormattedTextMessage: React.FC<{ content: string }> = ({ content }) => {
    // Regex to find URLs in the text
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const parts = useMemo(() => content.split(urlRegex), [content]);

    return (
        <p className="whitespace-pre-wrap break-all min-w-0">
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    // It's a URL
                    const wrappedUrl = part.replace(/([/?&.=_~-])/g, '$1\u200b');
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()} // Prevent bubble click handlers from firing
                        >
                            {wrappedUrl}
                        </a>
                    );
                }
                // It's a text part
                return part;
            })}
        </p>
    );
};

// Helper to format duration from seconds to MM:SS
const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const StatusIcon: React.FC<{ status: Message['status'] }> = ({ status }) => {
  const color = status === 'read' ? 'text-blue-400' : 'text-gray-400';
  if (status === 'sent') return <SingleCheckIcon className={`text-sm ${color}`} />;
  if (status === 'delivered' || status === 'read') return <DoubleCheckIcon className={`text-sm ${color}`} />;
  return null;
};

const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const setAudioData = () => setDuration(audio.duration);
            const setAudioTime = () => setCurrentTime(audio.currentTime);

            audio.addEventListener('loadeddata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);
            
            return () => {
                audio.removeEventListener('loadeddata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
            };
        }
    }, []);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(e => console.error("Audio play failed:", e));
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="flex items-center gap-2 w-64 text-white">
             <audio ref={audioRef} src={src} preload="metadata" onEnded={() => setIsPlaying(false)} />
             <button onClick={togglePlayPause}>
                {isPlaying ? <PauseIcon className="text-xl" /> : <PlayIcon className="text-xl" />}
             </button>
             <div className="w-full h-1 bg-gray-500 rounded-full flex-1">
                <div 
                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'}}
                    className="h-1 bg-white rounded-full"
                ></div>
             </div>
             <span className="text-xs text-gray-400">{formatDuration(duration)}</span>
        </div>
    );
};

const VIDEO_URL_REGEX = /\.(mp4|webm|mov|ogg|avi)(\?.*)?$/i;
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/;
const TIKTOK_REGEX = /https?:\/\/(?:www\.|m\.)?tiktok\.com\/.*\/video\/(\d+)/;
const RUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?rutube\.ru\/video\/([a-f0-9]{32})\/?/;

const getEmbedUrl = (preview: LinkPreview): string | null => {
    const { url, videoWidth, videoHeight } = preview;

    const youtubeMatch = url.match(YOUTUBE_REGEX);
    if (youtubeMatch && youtubeMatch[1]) {
        const isShortByUrl = url.includes('/shorts/');
        const isShortByDimensions = videoWidth && videoHeight && videoHeight > videoWidth;
        
        const params = new URLSearchParams();
        params.set('rel', '0');
        params.set('autoplay', '1');
        if (isShortByUrl || isShortByDimensions) {
            params.set('is_short', '1');
        }
        return `https://www.youtube.com/embed/${youtubeMatch[1]}?${params.toString()}`;
    }
    
    const vimeoMatch = url.match(VIMEO_REGEX);
    if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    const tiktokMatch = url.match(TIKTOK_REGEX);
    if (tiktokMatch && tiktokMatch[1]) {
        return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}?mute=0`;
    }
    
    const rutubeMatch = url.match(RUTUBE_REGEX);
    if (rutubeMatch && rutubeMatch[1]) {
        return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
    }

    return null;
}

const emojiCategories = [
    { name: "Недавние", category: Categories.SUGGESTED },
    { name: "Эмоции и люди", category: Categories.SMILEYS_PEOPLE },
    { name: "Животные и природа", category: Categories.ANIMALS_NATURE },
    { name: "Еда и напитки", category: Categories.FOOD_DRINK },
    { name: "Путешествия и места", category: Categories.TRAVEL_PLACES },
    { name: "Активности", category: Categories.ACTIVITIES },
    { name: "Объекты", category: Categories.OBJECTS },
    { name: "Символы", category: Categories.SYMBOLS },
    { name: "Флаги", category: Categories.FLAGS },
];

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSender, currentUserId, users, onViewImage, onViewVideo, onDeleteMessage, onReactToMessage, onForwardMessage, showConfirm }) => {
  const { content, timestamp, status, type, caption, linkPreview, forwardedFrom } = message;
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isFullEmojiPickerOpen, setFullEmojiPickerOpen] = useState(false);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [selectedEmojiForDelete, setSelectedEmojiForDelete] = useState<string | null>(null);
  const [contextMenuShowsHeader, setContextMenuShowsHeader] = useState(false);
  const [imgError, setImgError] = useState(false);

  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Memoize the check for video link previews for efficiency and clarity.
  const isVideoLinkPreview = useMemo(() => {
    if (type !== 'text' || !linkPreview) return false;
    return !!getEmbedUrl(linkPreview) || VIDEO_URL_REGEX.test(linkPreview.url);
  }, [type, linkPreview]);
    
  useEffect(() => {
    const timers = reactionTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useClickOutside(reactionPickerRef, () => setShowReactionPicker(false));

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  const handleContextMenuClose = () => {
    setIsContextMenuOpen(false);
    setContextMenuShowsHeader(false);
  };

  const handleDelete = () => {
      showConfirm(
        "Подтвердите действие",
        "Удалить сообщение?",
        () => onDeleteMessage(message.id)
      );
      handleContextMenuClose();
  }

  const handleForward = () => {
    onForwardMessage(message);
    handleContextMenuClose();
  }

  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Only trigger for touch events or right-clicks on desktop.
    if (e.type === 'contextmenu' || ('touches' in e)) {
        e.preventDefault();
        longPressTimerRef.current = setTimeout(() => {
            setContextMenuShowsHeader(true);
            setIsContextMenuOpen(true);
        }, 300); // 300ms for long press
    }
  };

  const handleLongPressEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
      }
  };
  
  const handleDeleteReaction = () => {
    if (selectedEmojiForDelete) {
        onReactToMessage(message.id, selectedEmojiForDelete);
        setSelectedEmojiForDelete(null);
    }
  };

  const renderContent = () => {
    const contentBody = (() => {
        switch (type) {
        case 'image':
            if (imgError) {
                return (
                    <div className="flex flex-col items-center justify-center bg-gray-700/50 rounded-md h-32 w-48 p-4 text-center">
                        <PhotoIcon className="text-3xl text-gray-500 mb-2"/>
                        <p className="text-xs text-gray-400">Изображение недоступно</p>
                    </div>
                );
            }
            return (
            <div className="relative cursor-pointer" onClick={() => onViewImage(content)}>
                <img 
                    src={content} 
                    alt={caption || 'image'} 
                    className="rounded-md w-full max-w-xs lg:max-w-sm" 
                    onError={() => setImgError(true)}
                />
                {caption && <p className="mt-1 text-sm break-words">{caption}</p>}
            </div>
            );
        case 'video': {
                const isEmbed = content.includes('youtube.com/embed/') || content.includes('player.vimeo.com/video/') || content.includes('tiktok.com/embed/') || content.includes('rutube.ru/play/embed/');
                const isTikTok = content.includes('tiktok.com/embed/');
                const isYouTubeShort = content.includes('youtube.com/embed/') && content.includes('is_short=1');
                
                let videoContainerClasses = 'relative w-full rounded-md overflow-hidden bg-black';
                if (isTikTok || isYouTubeShort) {
                    // Portrait videos like TikTok and YouTube Shorts use a 9:16 aspect ratio.
                    videoContainerClasses += ' aspect-[9/16]';
                } else {
                    // Default to landscape for other videos.
                    videoContainerClasses += ' aspect-video';
                }

                const videoElement = isEmbed ? (
                    <div className={videoContainerClasses}>
                        <iframe
                            src={content}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full"
                            scrolling="no"
                            title="Embedded video"
                            {...(isTikTok && { sandbox: 'allow-scripts allow-same-origin allow-forms' })}
                        ></iframe>
                    </div>
                ) : (
                    <div className="relative cursor-pointer group" onClick={() => onViewVideo(content)}>
                        <video src={`${content}#t=0.1`} className="rounded-md w-full" playsInline preload="metadata" muted />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md">
                            <PlayIcon className="text-white text-5xl opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                );

                return (
                    <div className="relative">
                        {videoElement}
                        {caption && <p className="mt-1 text-sm break-words">{caption}</p>}
                    </div>
                )
            }
        case 'document':
            const [fileName, fileSize] = content.split('|');
            return (
                <a href={caption} download={fileName} className="flex items-center gap-3 p-2 bg-black/20 rounded-md hover:bg-black/30">
                    <DocumentTextIcon className="text-3xl text-gray-300 flex-shrink-0"/>
                    <div>
                        <p className="font-semibold break-all">{fileName}</p>
                        <p className="text-xs text-gray-400">{fileSize}</p>
                    </div>
                </a>
            );
        case 'audio':
                return <AudioPlayer src={content} />;
        case 'gif':
                return <img src={content} alt="gif" className="rounded-md max-w-[200px]" onError={(e) => (e.currentTarget.style.display = 'none')} />;
        case 'sticker':
                return <img src={content} alt="sticker" className="w-32 h-32 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />;
        case 'text':
        default:
            const embedUrl = linkPreview ? getEmbedUrl(linkPreview) : null;
            
            const handleVideoClick = isVideoLinkPreview
                ? () => onViewVideo(embedUrl || linkPreview!.url)
                : undefined;

            return (
            <div className="min-w-0">
                {linkPreview && <LinkPreviewCard preview={linkPreview} onClick={handleVideoClick} isVideoPreview={isVideoLinkPreview} />}
                <FormattedTextMessage content={content} />
            </div>
            );
        }
    })();
    
    return (
        <div>
            {forwardedFrom && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <ShareIcon />
                    <span>Пересланное сообщение от <strong>{forwardedFrom.name}</strong></span>
                </div>
            )}
            {contentBody}
        </div>
    )
  };
  
  const MessageActions = () => {
    const handleEmojiIconClick = () => {
        const isMobile = window.innerWidth < 768; // Tailwind's `md` breakpoint
        if (isMobile) {
            setContextMenuShowsHeader(false); // On mobile, a simple tap on the icon only shows the picker
            setIsContextMenuOpen(true);
        } else {
            setShowReactionPicker(p => !p); // Keep original desktop behavior
        }
    };

    return (
    <div className={`flex items-center self-center gap-1 transition-opacity duration-200 opacity-50 md:opacity-0 group-hover:opacity-100 ${isSender ? 'flex-row-reverse' : ''}`}>
        <div className="relative" ref={reactionPickerRef}>
            <button
              onClick={handleEmojiIconClick}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-[#2a3942]"
              aria-label="Добавить реакцию"
            >
              <EmojiIcon className="text-lg" />
            </button>
            {showReactionPicker && (
                <div className={`absolute -top-12 z-20 ${isSender ? 'right-0' : 'left-0'}`}>
                    <ReactionPicker
                      onSelect={(emoji) => {
                        onReactToMessage(message.id, emoji);
                        setShowReactionPicker(false);
                      }}
                      onAddReaction={() => {
                        setShowReactionPicker(false);
                        setFullEmojiPickerOpen(true);
                      }}
                    />
                </div>
            )}
        </div>
        <button
            onClick={() => onForwardMessage(message)}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-[#2a3942]"
            aria-label="Переслать сообщение"
        >
            <ShareIcon className="text-lg" />
        </button>
    </div>
  )};

  const bubbleClasses = isSender ? 'bg-[#005c4b]' : 'bg-[#202c33]';
  const isSpecialMedia = type === 'sticker' || type === 'gif';

  const isVideo = type === 'video';
  
  let bubbleSizeClass;
  const responsiveMaxWidths = 'max-w-[calc(100%-1.25rem)] sm:max-w-[75%]';

  if (isVideo || (type === 'text' && linkPreview)) {
      bubbleSizeClass = `w-[250px] max-w-full`;
  } else if (type === 'gif' || type === 'sticker') {
      bubbleSizeClass = 'w-fit';
  } else if (type === 'image' && imgError) {
      bubbleSizeClass = 'w-fit'; // Shrink bubble if image failed
  } else {
      bubbleSizeClass = `${responsiveMaxWidths} md:max-w-md lg:max-w-xl min-w-24`;
  }

  const containerClasses = `relative rounded-lg min-w-0 ${bubbleSizeClass} ${isSpecialMedia ? '' : bubbleClasses} ${isSpecialMedia ? '' : 'px-3 py-2'}`;

  return (
    <div className={`flex flex-col w-full ${isSender ? 'items-end' : 'items-start'}`}>
        <div 
            className={`flex w-full group items-center gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
            onMouseLeave={handleLongPressEnd}
        >
            {isSender && <MessageActions />}
            <div 
                ref={bubbleRef}
                className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
                onMouseUp={handleLongPressEnd}
                onContextMenu={handleLongPressStart}
            >
                <div className={containerClasses}>
                    {isSender && (
                        <button 
                            onClick={handleDelete}
                            className="absolute top-1 right-1 z-10 w-6 h-6 bg-black/50 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                            aria-label="Удалить сообщение"
                        >
                            <XIcon className="text-sm" />
                        </button>
                    )}
                    {renderContent()}
                    <div className={`flex justify-end items-center gap-2 mt-1 h-4 ${isSpecialMedia ? 'absolute bottom-1 right-1 bg-black/50 px-1 py-0.5 rounded' : ''}`}>
                    <span className="text-xs text-gray-300 select-none">{formatTime(timestamp)}</span>
                    {isSender && <StatusIcon status={status} />}
                    </div>
                </div>
            </div>
            {!isSender && <MessageActions />}
        </div>
      
        {message.reactions && message.reactions.length > 0 && (
        <div className={`flex items-center gap-1 mt-1 mb-[5px]`}>
            {message.reactions.map(reaction => {
            const userHasReacted = reaction.userIds.includes(currentUserId);
            const reactionUserNames = reaction.userIds
                .map(id => (id === currentUserId ? 'Вы' : users.find(u => u.id === id)?.name) || 'Неизвестный')
                .join(', ');

            const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
                if (!userHasReacted) return;
                e.stopPropagation();
                reactionTimersRef.current[reaction.emoji] = setTimeout(() => {
                    setSelectedEmojiForDelete(reaction.emoji);
                    setBottomSheetOpen(true);
                }, 500);
            };

            const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
                e.stopPropagation();
                const timerId = reactionTimersRef.current[reaction.emoji];
                if (timerId) {
                    clearTimeout(timerId);
                    delete reactionTimersRef.current[reaction.emoji];
                }
            };
            
            const handleClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!userHasReacted) {
                    onReactToMessage(message.id, reaction.emoji);
                }
            };
            
            return (
                <button
                key={reaction.emoji}
                onClick={handleClick}
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                onContextMenu={(e) => e.preventDefault()}
                title={reactionUserNames}
                className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 transition-colors border ${userHasReacted ? 'bg-blue-600/50 border-blue-500 text-white' : 'bg-[#2a3942] border-transparent hover:bg-[#374248] text-gray-300'}`}
                >
                <span>{reaction.emoji}</span>
                <span className="font-semibold text-white">{reaction.userIds.length}</span>
                </button>
            );
            })}
        </div>
        )}
      
       {isContextMenuOpen && (
            <div 
                className="fixed inset-0 z-40 bg-black/50" 
                onClick={handleContextMenuClose}
            >
                {contextMenuShowsHeader && ReactDOM.createPortal(
                    <MessageActionHeader onDelete={handleDelete} onForward={handleForward} />,
                    document.body
                )}
                <div 
                    className="absolute z-50 p-2" 
                     style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ReactionPicker
                      onSelect={(emoji) => {
                        onReactToMessage(message.id, emoji);
                        handleContextMenuClose();
                      }}
                      onAddReaction={() => {
                        setFullEmojiPickerOpen(true);
                        handleContextMenuClose();
                      }}
                    />
                </div>
            </div>
        )}

      {isFullEmojiPickerOpen && (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
            onClick={() => setFullEmojiPickerOpen(false)}
        >
            <div onClick={(e) => e.stopPropagation()} className="bg-[#202c33] p-2 rounded-lg">
                <EmojiPicker
                    onEmojiClick={(emojiData: EmojiClickData) => {
                        onReactToMessage(message.id, emojiData.emoji);
                        setFullEmojiPickerOpen(false);
                    }}
                    theme={Theme.DARK}
                    lazyLoadEmojis={true}
                    height={400}
                    width={350}
                    searchPlaceholder="Поиск смайлов"
                    previewConfig={{ showPreview: false }}
                    categories={emojiCategories}
                    autoFocusSearch={false}
                />
            </div>
        </div>
      )}

      <ReactionBottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setBottomSheetOpen(false)}
          onDelete={handleDeleteReaction}
      />
    </div>
  );
};
