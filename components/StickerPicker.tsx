import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { stickerPacks } from '../services/stickerData';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface StickerPickerProps {
    onSelect: (url: string) => void;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect }) => {
    const [visiblePackId, setVisiblePackId] = useState<string>(stickerPacks[0]?.id || '');
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const mainListRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const packTitleRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const carouselIconRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Карусель внизу ---

    const checkCarouselScroll = useCallback(() => {
        const el = carouselRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }, []);

    useLayoutEffect(() => {
        checkCarouselScroll();
        window.addEventListener('resize', checkCarouselScroll);
        return () => window.removeEventListener('resize', checkCarouselScroll);
    }, [checkCarouselScroll]);

    const handleCarouselScroll = (direction: 'left' | 'right') => {
        const el = carouselRef.current;
        if (!el) return;
        const scrollAmount = direction === 'left' ? -el.clientWidth / 2 : el.clientWidth / 2;
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    const startScrolling = (direction: 'left' | 'right') => {
        stopScrolling();
        scrollIntervalRef.current = setInterval(() => {
            handleCarouselScroll(direction);
        }, 150);
    };

    const stopScrolling = () => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
        }
    };

    // --- Синхронизация списка и карусели ---

    // 1. Клик по иконке в карусели -> прокрутка основного списка
    const handlePackSelect = (packId: string) => {
        packTitleRefs.current[packId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        // Устанавливаем таймаут, чтобы избежать "дёргания" из-за onScroll
        if(scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        setVisiblePackId(packId); // Немедленно подсвечиваем иконку
    };
    
    // 2. Прокрутка основного списка -> подсветка иконки в карусели
    const handleMainScroll = () => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            const container = mainListRef.current;
            if (!container) return;
            
            let closestPackId = visiblePackId;
            let minDistance = Infinity;
            
            const containerTop = container.getBoundingClientRect().top;
            
            stickerPacks.forEach(pack => {
                const titleEl = packTitleRefs.current[pack.id];
                if (titleEl) {
                    const distance = Math.abs(titleEl.getBoundingClientRect().top - containerTop);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPackId = pack.id;
                    }
                }
            });

            if (closestPackId !== visiblePackId) {
                setVisiblePackId(closestPackId);
            }
        }, 100); // Небольшая задержка для производительности
    };
    
    // 3. Когда видимый пак меняется -> прокручиваем карусель, чтобы иконка была видна
    useEffect(() => {
        if (visiblePackId) {
            carouselIconRefs.current[visiblePackId]?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }, [visiblePackId]);


    return (
        <div style={{ height: 400 }} className="w-full flex flex-col">
            {/* Основная область для отображения всех стикерпаков */}
            <div
                ref={mainListRef}
                onScroll={handleMainScroll}
                className="flex-1 overflow-y-auto p-2 custom-scrollbar"
            >
                {stickerPacks.map((pack, index) => (
                    <div 
                        key={pack.id}
                        ref={el => { packTitleRefs.current[pack.id] = el; }}
                    >
                        <div
                            className={`sticky top-[-8px] z-10 bg-[#233138] pb-1 ${index === 0 ? 'pt-1' : 'pt-5'}`}
                        >
                            <h3 className="text-white font-semibold px-2 text-left">
                                {pack.name}
                            </h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {pack.stickers.map(url => (
                                <div
                                    key={url}
                                    className="cursor-pointer p-2 rounded-lg hover:bg-[#2a3942] transition-colors"
                                    onClick={() => onSelect(url)}
                                >
                                    <img src={url} alt="sticker" className="w-full h-full object-contain" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Нижняя панель-карусель */}
            <div className="relative flex items-center p-2 border-t border-[#2f3b44] flex-shrink-0">
                {canScrollLeft && (
                    <button 
                        onMouseDown={() => startScrolling('left')} onMouseUp={stopScrolling} onMouseLeave={stopScrolling}
                        onTouchStart={() => startScrolling('left')} onTouchEnd={stopScrolling}
                        className="absolute left-0 z-10 bg-gradient-to-r from-[#233138] to-transparent h-full px-2"
                    >
                        <ChevronLeftIcon className="text-white bg-black/30 rounded-full p-1"/>
                    </button>
                )}
                <div 
                    ref={carouselRef} 
                    onScroll={checkCarouselScroll} 
                    className="flex items-center gap-4 overflow-x-auto custom-scrollbar px-2" 
                    style={{ scrollbarWidth: 'none' }}
                >
                    {stickerPacks.map(pack => (
                        <button
                            key={pack.id}
                            ref={el => { carouselIconRefs.current[pack.id] = el; }}
                            onClick={() => handlePackSelect(pack.id)}
                            className={`p-1.5 rounded-lg transition-colors ${visiblePackId === pack.id ? 'bg-[#00A3E0]/50' : 'hover:bg-[#2a3942]'}`}
                        >
                            <img src={pack.icon} alt={pack.name} className="w-10 h-10 object-contain" />
                        </button>
                    ))}
                </div>
                {canScrollRight && (
                    <button 
                         onMouseDown={() => startScrolling('right')} onMouseUp={stopScrolling} onMouseLeave={stopScrolling}
                         onTouchStart={() => startScrolling('right')} onTouchEnd={stopScrolling}
                        className="absolute right-0 z-10 bg-gradient-to-l from-[#233138] to-transparent h-full px-2"
                    >
                        <ChevronRightIcon className="text-white bg-black/30 rounded-full p-1"/>
                    </button>
                )}
            </div>
        </div>
    );
};