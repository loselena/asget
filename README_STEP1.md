# ✅ ШАГ 1: Вынос ключей в переменные окружения

## Что было исправлено

🔒 **Критическая уязвимость безопасности:** Ключи Supabase были открыты в коде

## Изменённые файлы

- `services/supabase.ts` - использует переменные окружения
- `.env.local` - ваши реальные ключи (для разработки)
- `.env.example` - шаблон для новых окружений

## Как запустить

```bash
# 1. Установить зависимости (если ещё не установлены)
npm install

# 2. Запустить приложение
npm run dev
```

## Что проверить

✅ Приложение запускается без ошибок  
✅ В консоли видно "✅ Supabase initialized successfully"  
✅ Можно войти в приложение  
✅ Можно отправлять сообщения  
✅ Видеозвонки работают  

**Поведение должно быть ТОЧНО таким же, как до изменений!**

## Что изменилось под капотом

Вместо:
```typescript
const supabaseUrl = 'https://zucikfjtcsqkbbdnkbfv.supabase.co';
```

Теперь:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

Значение берётся из файла `.env.local`

## Если что-то не работает

### Проблема: "Supabase credentials missing"

**Решение:** Убедитесь, что файл `.env.local` существует и содержит:
```
VITE_SUPABASE_URL=https://zucikfjtcsqkbbdnkbfv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Проблема: Изменения не применяются

**Решение:** Перезапустите dev server:
```bash
# Ctrl+C чтобы остановить
npm run dev
```

## Для production деплоя

Когда будете деплоить на Netlify/Vercel:

1. Не загружайте `.env.local` на GitHub
2. Добавьте переменные в настройках хостинга:
   - `VITE_SUPABASE_URL` = `https://zucikfjtcsqkbbdnkbfv.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `ваш-ключ`

---

## Готово к следующему шагу?

Если приложение работает нормально, можем переходить к **Шагу 2: Обработка ошибок**
