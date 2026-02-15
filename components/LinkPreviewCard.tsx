
import React from 'react';
import type { LinkPreview } from '../types';
import { XIcon, PlayIcon } from './Icons';

interface LinkPreviewCardProps {
    preview: LinkPreview;
    onRemove?: () => void; // Optional remove callback
    onClick?: () => void;
    isVideoPreview?: boolean;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ preview, onRemove, onClick, isVideoPreview }) => {
    // Удаляем все хэштеги из описания, чтобы сделать его чище и избежать проблем с переносом
    const cleanedDescription = preview.description
        ? preview.description.replace(/#\w+/g, '').trim()
        : '';

    // Если превью для видео, оно будет занимать всю ширину родительского контейнера.
    // Ширина самого контейнера теперь контролируется в MessageBubble для консистентности.
    // Для обычных ссылок сохраняется прежнее поведение.
    const cardWidthClass = 'w-full max-w-full';

    const cardContent = (
        <div className="flex flex-col min-w-0">
            {preview.image && (
                <div className="relative">
                    <img src={preview.image} alt={preview.title} className="w-full h-32 object-cover" />
                    {isVideoPreview && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <PlayIcon className="text-white text-4xl" />
                        </div>
                    )}
                </div>
            )}
            <div className="p-3 min-w-0">
                {preview.siteName && (
                    <p className="text-xs text-gray-400 font-semibold uppercase">{preview.siteName}</p>
                )}
                <p className="font-bold text-sm text-white truncate min-w-0">{preview.title}</p>
                {cleanedDescription && (
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2 break-words">{cleanedDescription}</p>
                )}
            </div>
        </div>
    );
    
    return (
        <div className={`relative bg-black/20 rounded-lg overflow-hidden hover:bg-black/30 transition-colors my-2 ${cardWidthClass}`}>
            {onRemove && (
                 <button 
                    onClick={onRemove}
                    className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center bg-black/50 rounded-full text-white hover:bg-black/80"
                    aria-label="Remove link preview"
                 >
                    <XIcon className="text-sm"/>
                 </button>
            )}
            {onClick ? (
                <div onClick={onClick} className="block cursor-pointer">
                    {cardContent}
                </div>
            ) : (
                <a href={preview.url} target="_blank" rel="noopener noreferrer" className="block">
                    {cardContent}
                </a>
            )}
        </div>
    );
};
