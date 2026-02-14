import React from 'react';
import { XIcon } from './Icons';

interface VideoPreviewModalProps {
  videoUrl: string;
  onClose: () => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ videoUrl, onClose }) => {
  // Проверяем, является ли URL ссылкой для встраиваемого плеера (YouTube, Vimeo, TikTok, Rutube)
  const isEmbed = videoUrl.includes('youtube.com/embed/') || videoUrl.includes('player.vimeo.com/video/') || videoUrl.includes('tiktok.com/embed/') || videoUrl.includes('rutube.ru/play/embed/');

  // Определяем, является ли видео вертикальным
  const isTikTok = isEmbed && videoUrl.includes('tiktok.com/embed/');
  const isYouTubeShort = isEmbed && videoUrl.includes('youtube.com/embed/') && videoUrl.includes('is_short=1');
  const isVerticalEmbed = isTikTok || isYouTubeShort;

  const renderPlayer = () => {
    if (isTikTok) {
      // Используем CSS `clip-path` для точной обрезки.
      // Это позволяет нам не изменять размер iframe, а просто "отрезать" лишние части
      // от уже отрисованного контента, что гарантированно скрывает UI тиктока.
      return (
        <div className="relative w-full aspect-[9/16] rounded-lg shadow-2xl bg-black">
          <iframe
            src={videoUrl}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            // iframe остается 100% высоты, а clip-path обрезает лишнее.
            className="w-full h-full"
            style={{ clipPath: 'inset(1px 10px 21px 10px)' }}
            scrolling="no"
            // Разрешения sandbox необходимы для корректной работы плеера и воспроизведения по клику.
            // Удалено 'allow-popups' для предотвращения открытия новых вкладок на сайт TikTok.
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="TikTok Video Player"
          />
        </div>
      );
    }
    
    if (isEmbed) {
      // Стандартная обработка для других встраиваемых видео, таких как YouTube, Vimeo и т.д.
      const iframeClassName = `w-full ${isVerticalEmbed ? 'aspect-[9/16]' : 'aspect-video'} rounded-lg shadow-2xl bg-black`;
      
      return (
        <iframe
          src={videoUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={iframeClassName}
          title="Video Player"
        />
      );
    }
    // Используем тег video для прямых видеофайлов (например, .mp4)
    return (
      <video 
        src={videoUrl} 
        controls 
        autoPlay
        className="block w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
      />
    );
  };
  
  // Устанавливаем класс для контейнера в зависимости от ориентации видео
  const containerClassName = `relative w-full ${isVerticalEmbed ? 'max-w-sm' : 'max-w-4xl'}`;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in-out;
        }
      `}</style>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors z-10"
        aria-label="Close video preview"
      >
        <XIcon className="text-3xl" />
      </button>
      
      <div 
        className={containerClassName}
        onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике на само видео
      >
        {renderPlayer()}
      </div>
    </div>
  );
};