// services/errorHandler.ts
import toast from 'react-hot-toast';

export enum ErrorType {
  NETWORK = 'network',
  DATABASE = 'database',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  FILE_UPLOAD = 'file_upload',
  UNKNOWN = 'unknown'
}

interface ErrorContext {
  type: ErrorType;
  context: string;
  error: Error | unknown;
  userId?: number;
}

class ErrorHandler {
  private isDevelopment = import.meta.env.DEV;

  // Основной обработчик ошибок
  handle(errorContext: ErrorContext): void {
    const { type, context, error, userId } = errorContext;

    // Логирование в консоль (в development подробнее)
    if (this.isDevelopment) {
      console.group(`❌ Error [${type}] in ${context}`);
      console.error(error);
      if (userId) console.log('User ID:', userId);
      console.groupEnd();
    } else {
      console.error(`[${type}] ${context}:`, error);
    }

    // Показываем уведомление пользователю
    this.showUserNotification(type, error);
  }

  private showUserNotification(type: ErrorType, error: Error | unknown): void {
    const message = this.getUserFriendlyMessage(type, error);
    
    toast.error(message, {
      duration: 5000,
      position: 'top-center',
      icon: '⚠️',
      style: {
        background: '#ef4444',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '500px',
      },
    });
  }

  private getUserFriendlyMessage(type: ErrorType, error: Error | unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);

    switch (type) {
      case ErrorType.NETWORK:
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          return 'Нет подключения к интернету. Проверьте соединение.';
        }
        return 'Ошибка сети. Попробуйте позже.';

      case ErrorType.DATABASE:
        if (errorMessage.includes('permission')) {
          return 'Нет доступа к данным. Попробуйте войти снова.';
        }
        return 'Ошибка базы данных. Попробуйте обновить страницу.';

      case ErrorType.PERMISSION:
        return 'У вас нет прав для этого действия.';

      case ErrorType.VALIDATION:
        return errorMessage || 'Проверьте введённые данные.';

      case ErrorType.FILE_UPLOAD:
        if (errorMessage.includes('size')) {
          return 'Файл слишком большой. Максимум 50 МБ.';
        }
        return 'Не удалось загрузить файл. Попробуйте снова.';

      default:
        return 'Что-то пошло не так. Попробуйте ещё раз.';
    }
  }

  // Хелпер для успешных операций
  showSuccess(message: string): void {
    toast.success(message, {
      duration: 3000,
      position: 'top-center',
      icon: '✅',
      style: {
        background: '#10b981',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  }

  // Хелпер для информационных сообщений
  showInfo(message: string): void {
    toast(message, {
      duration: 4000,
      position: 'top-center',
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  }

  // Обёртка для async операций с автоматической обработкой ошибок
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    type: ErrorType = ErrorType.UNKNOWN,
    userId?: number
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle({ type, context, error, userId });
      return null;
    }
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Удобные функции для импорта
export const handleError = (
  error: Error | unknown,
  context: string,
  type: ErrorType = ErrorType.UNKNOWN,
  userId?: number
) => {
  errorHandler.handle({ type, context, error, userId });
};

export const showSuccess = (message: string) => errorHandler.showSuccess(message);
export const showInfo = (message: string) => errorHandler.showInfo(message);

// Пример использования:
// import { handleError, showSuccess, ErrorType } from './services/errorHandler';
//
// try {
//   await AppService.sendMessage(...);
//   showSuccess('Сообщение отправлено');
// } catch (error) {
//   handleError(error, 'sendMessage', ErrorType.DATABASE);
// }
