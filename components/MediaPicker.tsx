
import React, { useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme, Categories } from 'emoji-picker-react';
import { GifPicker } from './GifPicker';
import { StickerPicker } from './StickerPicker';
// Fix: Corrected import path for Icons.
import { EmojiIcon, GifIcon, StickerIcon } from './Icons';

type ActiveTab = 'emoji' | 'gif' | 'sticker';

interface MediaPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onGifSelect: (url: string) => void;
    onStickerSelect: (url: string) => void;
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

export const MediaPicker: React.FC<MediaPickerProps> = ({ onEmojiSelect, onGifSelect, onStickerSelect }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('emoji');

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        onEmojiSelect(emojiData.emoji);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'emoji':
                return (
                    <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        theme={Theme.DARK}
                        lazyLoadEmojis={true}
                        height={400}
                        width="100%"
                        searchPlaceholder="Поиск смайлов"
                        previewConfig={{ showPreview: false }}
                        categories={emojiCategories}
                        autoFocusSearch={false}
                    />
                );
            case 'gif':
                return <GifPicker onSelect={onGifSelect} />;
            case 'sticker':
                return <StickerPicker onSelect={onStickerSelect} />;
            default:
                return null;
        }
    };
    
    const TabButton: React.FC<{ tabName: ActiveTab; children: React.ReactNode }> = ({ tabName, children }) => (
        <button 
            onClick={() => setActiveTab(tabName)}
            className={`p-3 ${activeTab === tabName ? 'border-b-2 border-[#00A3E0]' : ''}`}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-[#233138] rounded-lg shadow-lg overflow-hidden w-[350px] max-w-full">
            <div className="flex justify-around items-center border-b border-[#2f3b44]">
                <TabButton tabName="emoji"><EmojiIcon className="text-2xl text-[#8696a0]" /></TabButton>
                <TabButton tabName="gif"><GifIcon className="text-2xl text-[#8696a0]" /></TabButton>
                <TabButton tabName="sticker"><StickerIcon className="text-2xl text-[#8696a0]" /></TabButton>
            </div>
            <div className="p-2">
                {renderContent()}
            </div>
        </div>
    );
};
