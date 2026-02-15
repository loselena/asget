

// Fix: Corrected import path for types.
import type { User, Chat } from './types';

// Начальные данные больше не используются, так как состояние полностью
// управляется через localStorage и AppService.
// Это предотвращает случайный сброс данных пользователей при перезагрузке.
export const initialUsers: User[] = [];
export const initialChats: Chat[] = [];
