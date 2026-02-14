import { useState, useEffect, useCallback } from 'react';

/**
 * Хук для чтения данных из хранилища (localStorage) и подписки на их изменения.
 * Этот хук НЕ записывает данные. Записью занимается ИСКЛЮЧИТЕЛЬНО AppService.
 * Это предотвращает состояния гонки и обеспечивает единый источник правды.
 * @param key Ключ в localStorage.
 * @param initialValue Начальное значение.
 */
export const useStore = <T,>(key: string | null, initialValue: T): T => {
  const [value, setValue] = useState<T>(() => {
    if (!key) return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  const updateState = useCallback(() => {
    if (!key) {
        setValue(initialValue);
        return;
    };
    try {
        const item = window.localStorage.getItem(key);
        setValue(item ? JSON.parse(item) : initialValue);
    } catch (error) {
        console.error(`Error parsing value for key "${key}" on update:`, error);
        setValue(initialValue);
    }
  }, [key]);
  
  useEffect(() => {
    // Первоначальное обновление на случай, если данные изменились, пока компонент не был смонтирован.
    updateState();

    const handleStorageChange = (event: StorageEvent) => {
      // event.key === null, когда вызывается localStorage.clear()
      // Если ключ совпадает, или если хранилище было очищено, обновляем состояние.
      if (event.key === key || event.key === null) {
        updateState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, updateState]);

  return value;
};