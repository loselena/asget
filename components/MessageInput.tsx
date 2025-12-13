import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { PaperclipIcon, EmojiIcon, MicIcon, SendIcon, PhotoIcon, DocumentTextIcon, XIcon, PlayIcon } from './Icons';
import { MediaPicker } from './MediaPicker';
import { LinkPreviewCard } from './LinkPreviewCard';
import { useClickOutside } from '../hooks/useClickOutside';
import type { LinkPreview, Message } from '../types';

interface MessageInputProps {
  onSendMessage: (messages: {
    content: string;
    type: 'text' | 'image' | 'gif' | 'sticker' | 'document' | 'video' | 'audio';
    caption?: string;
    linkPreview?: LinkPreview;
    file?: File;
  }[]) => void;
  onTyping: () => void;
  fetchLinkPreview: (url: string) => Promise<LinkPreview | null>;
}

const URL_REGEX = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
const IMAGE_URL_REGEX = /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i;
const VIDEO_URL_REGEX = /\.(mp4|webm|mov|ogg|avi)(\?.*)?$/i;

const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/;
const TIKTOK_REGEX = /https?:\/\/(?:www\.|m\.)?tiktok\.com\/.*\/video\/(\d+)/;
const RUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?rutube\.ru\/video\/([a-f0-9]{32})\/?/;

const getEmbedUrl = (url: string): string | null => {
    const youtubeMatch = url.match(YOUTUBE_REGEX);
    if (youtubeMatch && youtubeMatch[1]) {
        // Check if the original URL indicates it's a Short
        const isShort = url.includes('/shorts/');
        const params = new URLSearchParams();
        params.set('rel', '0');
        if (isShort) {
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


// Helper to format duration from seconds to MM:SS
const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Component for displaying a single file preview before sending
const FilePreview: React.FC<{
  preview: { url: string; type: 'image' | 'video' | 'document', file?: File };
  onRemove: () => void;
}> = ({ preview, onRemove }) => {
    const isYoutube = preview.type === 'video' && preview.url.includes('youtube.com/embed');
    const isTikTok = preview.type === 'video' && preview.url.includes('tiktok.com/embed');
    // Generates a thumbnail URL from a YouTube embed URL
    const youtubeThumbnail = isYoutube 
        ? `https://img.youtube.com/vi/${preview.url.split('/').pop()?.split('?')[0]}/mqdefault.jpg` 
        : '';
  
  return (
    <div className="relative w-24 h-24 flex-shrink-0 bg-[#2a3942] rounded-lg overflow-hidden flex items-center justify-center">
      {preview.type === 'image' && (
        <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
      )}
      {preview.type === 'video' && (
        isYoutube ? (
             <>
                <img src={youtubeThumbnail} alt="YouTube Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <PlayIcon className="text-white text-3xl"/>
                </div>
            </>
        ) : isTikTok ? (
            <>
                <div className="w-full h-full bg-black"></div>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <PlayIcon className="text-white text-3xl"/>
                </div>
            </>
        ) : (
            <>
                <video src={preview.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <PlayIcon className="text-white text-3xl"/>
                </div>
            </>
        )
      )}
      {preview.type === 'document' && (
        <div className="text-center p-1">
            <DocumentTextIcon className="text-4xl text-gray-300 mx-auto" />
            <p className="text-xs text-gray-400 mt-1 break-all line-clamp-2">{preview.file?.name}</p>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center bg-black/60 rounded-full text-white hover:bg-black/80"
        aria-label="Remove file"
      >
        <XIcon className="text-xs" />
      </button>
    </div>
  );
};

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, fetchLinkPreview }) => {
  const [text, setText] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [filePreviews, setFilePreviews] = useState<{file?: File, url: string, type: 'image' | 'video' | 'document'}[]>([]);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaPickerRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Fix: Use ReturnType<typeof setInterval> for browser compatibility instead of NodeJS.Timeout.
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  useClickOutside(mediaPickerRef, () => setShowMediaPicker(false));
  useClickOutside(attachmentMenuRef, () => setShowAttachmentMenu(false));
  
  // Auto-resize textarea
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  // Link preview and media URL detection logic
  useEffect(() => {
    let isMounted = true;
    let textToModify = text;
    let didExtractMedia = false;

    const urls = text.match(URL_REGEX);

    if (urls) {
        // Find all media URLs (direct image links)
        const mediaUrlData = urls.map(originalUrl => {
            if (IMAGE_URL_REGEX.test(originalUrl)) return { originalUrl, finalUrl: originalUrl, type: 'image' as const };
            return null;
        }).filter((item): item is { originalUrl: string, finalUrl: string, type: 'image' } => item !== null);

        if (mediaUrlData.length > 0) {
            const newPreviews: { url: string, type: 'image'}[] = [];
            
            mediaUrlData.forEach(({ originalUrl, finalUrl, type }) => {
                // Remove the URL from the text that will be kept in the input
                textToModify = textToModify.replace(originalUrl, '');

                // Add to a temporary list to be added to state
                if (!filePreviews.some(p => p.url === finalUrl)) {
                    newPreviews.push({ url: finalUrl, type });
                }
            });

            if (newPreviews.length > 0) {
                setFilePreviews(prev => [...prev, ...newPreviews]);
                didExtractMedia = true;
            }
        }
    }
    
    // If we extracted media, update the text input and prevent link previews.
    if (didExtractMedia) {
        setText(textToModify.trim());
        if (linkPreview) setLinkPreview(null);
        return; // Exit to allow state to update before re-evaluating.
    }

    // --- Fallback to Single Link Preview Logic ---
    // This only runs if NO embeddable media was found above.
    const remainingUrls = text.match(URL_REGEX);
    if (remainingUrls && filePreviews.length === 0) {
        const firstUrl = remainingUrls[0];
        if (firstUrl && firstUrl !== linkPreview?.url) {
            setLinkPreview(null);
            setIsFetchingPreview(true);
            
            fetchLinkPreview(firstUrl).then(preview => {
                if (isMounted && text.includes(firstUrl)) {
                    setLinkPreview(preview);
                }
            }).finally(() => {
                if (isMounted) setIsFetchingPreview(false);
            });
        }
    } else if (!remainingUrls && linkPreview) {
        setLinkPreview(null);
    }
    
    return () => {
      isMounted = false;
    };
  }, [text, fetchLinkPreview, filePreviews, linkPreview]);


  const handleSendMessage = () => {
    const hasFiles = filePreviews.length > 0;
    const hasText = text.trim().length > 0;

    if (!hasFiles && !hasText) return;

    type MessagePayload = {
      content: string;
      type: 'text' | 'image' | 'gif' | 'sticker' | 'document' | 'video' | 'audio';
      caption?: string;
      linkPreview?: LinkPreview;
      file?: File;
    };

    let messagesToSend: MessagePayload[] = [];

    if (hasFiles) {
        const caption = hasText ? text.trim() : undefined;
        messagesToSend = filePreviews.map(preview => {
            const { file, url, type } = preview;
            const content = type === 'document' && file ? `${file.name}|${(file.size / 1024).toFixed(1)} KB` : url;
            const finalCaption = type === 'document' ? url : caption;
            // IMPORTANT: Pass the file object up so it can be uploaded
            return { content, type, caption: finalCaption, file: file };
        });
    } else if (hasText) {
        messagesToSend.push({
            content: text.trim(),
            type: 'text',
            linkPreview: linkPreview ?? undefined,
        });
    }
    
    if (messagesToSend.length > 0) {
        onSendMessage(messagesToSend);
    }
    
    // Reset state after sending
    setFilePreviews([]);
    setText('');
    setLinkPreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onTyping();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPreviews = Array.from(files).map((file: File) => {
        const fileUrl = URL.createObjectURL(file);
        const type: 'image' | 'video' | 'document' = file.type.startsWith('image/') ? 'image'
                                  : file.type.startsWith('video/') ? 'video'
                                  : 'document';
        return { file, url: fileUrl, type };
    });

    setFilePreviews(prev => [...prev, ...newPreviews]);
    
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
    setShowAttachmentMenu(false);
  };
  
  const handleRemovePreview = (urlToRemove: string) => {
    setFilePreviews(prev => prev.filter(p => p.url !== urlToRemove));
    // Revoke the object URL to free up memory if it's a blob URL
    if (urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
    }
  };

  const handleStartRecording = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const audioChunks: Blob[] = [];

            mediaRecorderRef.current.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                onSendMessage([{ content: audioUrl, type: 'audio' }]);
                stream.getTracks().forEach(track => track.stop()); // Stop the microphone access
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone access error:", err);
            let errorMessage = "Не удалось получить доступ к микрофону. Проверьте разрешения в настройках браузера.";
            if (err instanceof DOMException) {
                if (err.name === 'NotFoundError') {
                    errorMessage = 'Микрофон не найден. Убедитесь, что устройство подключено и работает.';
                } else if (err.name === 'NotAllowedError') {
                    errorMessage = 'Доступ к микрофону запрещен. Пожалуйста, разрешите доступ в настройках браузера.';
                }
            }
            setMicError(errorMessage);
            // Clear error after 5 seconds
            setTimeout(() => setMicError(null), 5000);
        }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setRecordingTime(0);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji);
  };
  
  const handleGifSelect = (url: string) => {
      onSendMessage([{ content: url, type: 'gif' }]);
      setShowMediaPicker(false);
  }
  
  const handleStickerSelect = (url: string) => {
      onSendMessage([{ content: url, type: 'sticker' }]);
      setShowMediaPicker(false);
  }

  const renderMicOrSend = () => {
      if (text.trim() || linkPreview || filePreviews.length > 0) {
          return (
             <button onClick={handleSendMessage} className="p-2 rounded-full text-[#8696a0] hover:bg-[#374248]">
                <SendIcon className="text-xl text-[#00a884]" />
             </button>
          );
      }
      return (
          <button 
            onMouseDown={handleStartRecording} 
            onMouseUp={handleStopRecording} 
            onTouchStart={handleStartRecording}
            onTouchEnd={handleStopRecording}
            className={`p-2 rounded-full text-[#8696a0] ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-[#374248]'}`}
          >
              <MicIcon className="text-2xl" />
          </button>
      );
  }

  return (
    <div className="px-4 py-2 bg-[#202c33] border-t border-[#2f3b44] relative z-10">
      {/* Pop-up menus */}
      <div className="relative">
        <div ref={mediaPickerRef}>
            {showMediaPicker && (
              <div className="absolute bottom-full left-0 right-0 mb-2 flex justify-center md:right-auto md:justify-start">
                <MediaPicker onEmojiSelect={handleEmojiSelect} onGifSelect={handleGifSelect} onStickerSelect={handleStickerSelect} />
              </div>
            )}
        </div>
        <div ref={attachmentMenuRef}>
            {showAttachmentMenu && (
                 <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#233138] rounded-md shadow-lg z-10 py-2">
                    <button onClick={() => mediaInputRef.current?.click()} className="flex items-center w-full px-4 py-2 text-sm text-[#d1d7db] hover:bg-[#182229]">
                        <PhotoIcon className="mr-3 text-lg text-blue-400"/>
                        Фото или видео
                    </button>
                     <button onClick={() => docInputRef.current?.click()} className="flex items-center w-full px-4 py-2 text-sm text-[#d1d7db] hover:bg-[#182229]">
                        <DocumentTextIcon className="mr-3 text-lg text-purple-400"/>
                        Документ
                    </button>
                 </div>
            )}
        </div>
      </div>

       {micError && (
        <div className="text-xs text-red-400 p-2 text-center bg-red-900/50 rounded-md mb-2">
            {micError}
        </div>
       )}
       
       {filePreviews.length > 0 && (
        <div className="p-2 bg-black/20 rounded-t-lg -mx-4 -mt-2 mb-2 border-b-2 border-[#2f3b44]">
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 px-2">
                {filePreviews.map(p => (
                    <FilePreview key={p.url} preview={p} onRemove={() => handleRemovePreview(p.url)} />
                ))}
            </div>
        </div>
       )}

       {linkPreview && !isRecording && (
          <div className="w-[250px] ml-2.5">
            <LinkPreviewCard preview={linkPreview} onRemove={() => setLinkPreview(null)} />
          </div>
       )}
       {isFetchingPreview && <div className="text-xs text-gray-400 p-2">Загрузка превью...</div>}

       {isRecording && (
        <div className="flex items-center justify-between p-2">
            <div className="flex items-center">
                 <MicIcon className="text-2xl text-red-500 animate-pulse mr-2" />
                 <span className="text-white">{formatDuration(recordingTime)}</span>
            </div>
            <span className="text-sm text-gray-400">Отпустите, чтобы отправить</span>
        </div>
       )}

      <div className="flex items-end gap-3">
        {!isRecording && (
            <>
                 <div className="flex items-center gap-1 text-[#8696a0]">
                  <button onClick={() => setShowMediaPicker(p => !p)} className="p-2 rounded-full hover:bg-[#374248]">
                    <EmojiIcon className="text-2xl" />
                  </button>
                  <button onClick={() => setShowAttachmentMenu(p => !p)} className="p-2 rounded-full hover:bg-[#374248]">
                    <PaperclipIcon className="text-xl -rotate-45" />
                  </button>
                  {/* Hidden inputs for file selection */}
                  <input type="file" ref={mediaInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp, video/*" multiple />
                  <input type="file" ref={docInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv,.md,.rtf" multiple />
                </div>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={filePreviews.length > 0 ? 'Добавить подпись...' : 'Введите сообщение'}
                  className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2.5 max-h-44 resize-none text-white placeholder:text-[#8696a0] focus:outline-none custom-scrollbar"
                />
            </>
        )}
        
        {renderMicOrSend()}
      </div>
    </div>
  );
};
