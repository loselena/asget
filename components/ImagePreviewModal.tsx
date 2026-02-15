
import React from 'react';
// Fix: Corrected import path for Icons.
import { XIcon } from './Icons';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
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
        aria-label="Close image preview"
      >
        <XIcon className="text-3xl" />
      </button>
      
      <div 
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image itself
      >
        <img 
          src={imageUrl} 
          alt="Image preview" 
          className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
};
