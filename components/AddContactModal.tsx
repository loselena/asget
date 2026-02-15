import React, { useState, useRef } from 'react';
// Fix: Corrected import path for types.
import type { User, UserInvitePayload } from '../types';
// Fix: Corrected import path for Icons.
import { XIcon } from './Icons';
import { useClickOutside } from '../hooks/useClickOutside';

interface AddContactModalProps {
  currentUser: User;
  onClose: () => void;
  onAddContact: (contactPayload: UserInvitePayload) => Promise<boolean> | boolean;
}

// A robust, URL-safe Base64 encoding for Unicode strings.
const b64EncodeUnicode = (str: string): string => {
    try {
        const utf8Bytes = new TextEncoder().encode(str);
        const binaryString = String.fromCharCode(...utf8Bytes);
        const base64 = btoa(binaryString);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (e) {
        console.error("Encoding failed:", e);
        return '';
    }
};

// A robust, URL-safe Base64 decoding for Unicode strings.
const b64DecodeUnicode = (str: string): string => {
    try {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const binaryString = atob(base64);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch (e) {
        console.error("Decoding failed:", e);
        return '';
    }
};


export const AddContactModal: React.FC<AddContactModalProps> = ({ currentUser, onClose, onAddContact }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useClickOutside(modalRef, onClose);

  const userPayload: UserInvitePayload = {
    id: currentUser.id,
    name: currentUser.name,
    avatar: currentUser.avatar,
    publicKey: currentUser.publicKey,
    isOnline: currentUser.isOnline,
  };

  const encodedPayload = b64EncodeUnicode(JSON.stringify(userPayload));
  const currentUserInviteLink = `${window.location.origin}/add/${encodedPayload}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUserInviteLink)}`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(currentUserInviteLink).then(() => {
      setCopySuccess('Ссылка скопирована!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Не удалось скопировать.');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const handleAddClick = async () => {
    setError(null); // Reset error on new attempt
    setIsProcessing(true);
    try {
        const match = inviteLink.match(/\/add\/([^/?]+)/);
        if (!match || !match[1]) {
            setError('Неверный формат ссылки. Убедитесь, что вы скопировали ее полностью.');
            setIsProcessing(false);
            return;
        }
        
        const encodedData = match[1];
        const decodedJson = b64DecodeUnicode(encodedData);
        if (!decodedJson) {
            setError('Не удалось расшифровать ссылку. Возможно, она была скопирована не полностью.');
            setIsProcessing(false);
            return;
        }
        
        const contactPayload: UserInvitePayload = JSON.parse(decodedJson);
        
        // Basic validation of the payload structure
        if (typeof contactPayload.id !== 'number' || typeof contactPayload.name !== 'string' || typeof contactPayload.avatar !== 'string') {
             setError("Ссылка не содержит всех необходимых данных. Попросите отправить ее снова.");
             setIsProcessing(false);
             return;
        }

        const result = onAddContact(contactPayload);
        const success = result instanceof Promise ? await result : result;
        
        if (success) {
            setInviteLink('');
            onClose();
        }
        // onAddContact will show its own alerts for "already in contacts" or "can't add self".
        
    } catch (e) {
        console.error("Error parsing invite link:", e);
        if (e instanceof SyntaxError) { // Catches JSON.parse errors
             setError("Данные в ссылке повреждены. Пожалуйста, попросите отправить ее снова.");
        } else {
             setError('Не удалось обработать ссылку. Проверьте ее и попробуйте снова.');
        }
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-[#202c33] rounded-lg shadow-xl w-full max-w-md p-6 text-white relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XIcon className="text-2xl" />
        </button>

        <h2 className="text-2xl font-bold mb-4">Добавить контакт</h2>
        
        <div className="text-center p-4 border border-gray-600 rounded-lg">
            <h3 className="font-semibold mb-2">Поделитесь вашим приглашением</h3>
            <div className="flex justify-center mb-3">
                <img src={qrCodeUrl} alt="QR Code" className="bg-white p-1 rounded-md" />
            </div>
            <div className="relative bg-[#2a3942] rounded-md p-2 flex items-center">
                <input
                    type="text"
                    readOnly
                    value={currentUserInviteLink}
                    className="bg-transparent w-full text-sm text-gray-300 outline-none pr-16"
                />
                <button 
                    onClick={handleCopyToClipboard} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#00A3E0] text-white px-2 py-1 text-xs rounded hover:bg-[#0082b3]"
                >
                    {copySuccess ? 'Готово!' : 'Копировать'}
                </button>
            </div>
             {copySuccess && <p className="text-xs text-green-400 mt-2">{copySuccess}</p>}
        </div>

        <div className="mt-6">
             <h3 className="font-semibold mb-2">Добавить по ссылке</h3>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inviteLink}
                    onChange={(e) => {
                        setInviteLink(e.target.value);
                        setError(null);
                    }}
                    placeholder="Вставьте ссылку-приглашение..."
                    className={`flex-1 shadow appearance-none border-2 ${error ? 'border-red-500' : 'border-[#2a3942]'} rounded w-full py-2 px-3 text-[#e9edef] bg-[#2a3942] leading-tight focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-[#00A3E0]'} transition-colors`}
                    aria-invalid={!!error}
                    aria-describedby="invite-link-error"
                    disabled={isProcessing}
                />
                <button 
                    onClick={handleAddClick} 
                    className="bg-[#00A3E0] text-white font-bold py-2 px-4 rounded hover:bg-[#0082b3] disabled:bg-gray-500"
                    disabled={!inviteLink || isProcessing}
                >
                    {isProcessing ? '...' : 'Добавить'}
                </button>
            </div>
            {error && <p id="invite-link-error" className="text-sm text-red-400 mt-2" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
};