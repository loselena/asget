
import React, { useState, useEffect, useCallback } from 'react';
// Fix: Corrected import path for Icons.
import { SearchIcon } from './Icons';

interface GifPickerProps {
    onSelect: (url: string) => void;
}

interface GiphyImage {
    id: string;
    images: {
        fixed_width: {
            url: string;
        }
    };
}

const API_KEY = 'W0QWndbRQI73kuXuohLXLLkgfYJm30WS';
const GIPHY_TRENDING_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=20`;
const GIPHY_SEARCH_URL = `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&limit=20&q=`;

// Debounce function
const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect }) => {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<GiphyImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGifs = async (url: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch GIFs from GIPHY');
            }
            const data = await response.json();
            setGifs(data.data);
        } catch (err) {
            console.error(err);
            setError('Не удалось загрузить GIF. Попробуйте позже.');
            setGifs([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            if (query) {
                fetchGifs(`${GIPHY_SEARCH_URL}${encodeURIComponent(query)}`);
            } else {
                fetchGifs(GIPHY_TRENDING_URL); // Fetch trending if search is cleared
            }
        }, 500),
        []
    );

    useEffect(() => {
        // Initial fetch for trending GIFs
        fetchGifs(GIPHY_TRENDING_URL);
    }, []);
    
    useEffect(() => {
        debouncedSearch(search);
    }, [search, debouncedSearch]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };
    
    const renderContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-[340px] text-[#8696a0]">Загрузка...</div>;
        }
        if (error) {
            return <div className="flex items-center justify-center h-[340px] text-red-400">{error}</div>;
        }
        if (gifs.length === 0) {
            return <div className="flex items-center justify-center h-[340px] text-[#8696a0]">Ничего не найдено.</div>;
        }
        return (
             <div className="overflow-y-auto grid grid-cols-2 gap-1 h-[340px]">
                {gifs.map(gif => (
                    <div key={gif.id} className="cursor-pointer" onClick={() => onSelect(gif.images.fixed_width.url)}>
                        <img src={gif.images.fixed_width.url} alt="gif" className="w-full h-full object-cover rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{ height: 400 }} className="w-full">
            <div className="relative mb-2">
                <input
                    type="text"
                    placeholder="Искать все GIF на GIPHY"
                    value={search}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#2a3942] text-[#d1d7db] placeholder:text-[#8696a0] focus:outline-none"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon className="text-lg text-[#8696a0]" />
                </div>
            </div>
           {renderContent()}
        </div>
    );
};