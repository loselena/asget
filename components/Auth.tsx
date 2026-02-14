import React, { useState } from 'react';

interface AuthProps {
  onLogin: (name: string) => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Пожалуйста, введите ваше имя.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onLogin(name.trim());
    } catch (err) {
      setError('Не удалось войти. Пожалуйста, попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-gray-900 text-white">
      <div className="w-full max-w-sm p-8 bg-[#111b21] rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-200 mb-6">Добро пожаловать</h1>
        <p className="text-center text-gray-400 mb-2">Введите ваше имя, чтобы начать общение.</p>
        <p className="text-center text-xs text-gray-500 mb-8">
            Чтобы увидеть демо-режим с контактами, введите имя <code className="bg-gray-700 px-1 rounded">Alice</code>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-400 text-sm font-bold mb-2">
              Имя
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#202c33] rounded-lg px-4 py-3 text-white placeholder:text-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00A3E0]"
              placeholder="Например, Alice"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-[#00A3E0] hover:bg-[#0082b3] text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:bg-gray-600"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Вход...' : 'Войти в чат'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};