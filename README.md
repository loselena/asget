# ASGET

Веб-мессенджер: чаты, медиа, голосовые и видеозвонки (WebRTC). Интерфейс на русском.

**Стек:** React 19, TypeScript, Vite, Tailwind CSS, **Supabase** (БД, Realtime, Storage).

Без настроенного Supabase приложение работает в демо-режиме (данные в `localStorage`, вход по имени, например «Alice»).

---

## Запуск локально

**Нужно:** Node.js (LTS).

1. Установить зависимости:
   ```bash
   npm install
   ```
2. **(Опционально)** Скопировать [.env.example](.env.example) в `.env` и заполнить:
   - **Supabase** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — для облачного чата и синхронизации.
   - **Metered** (`VITE_METERED_DOMAIN`, `VITE_METERED_API_KEY`) — опционально, для видеозвонков через мобильный интернет (TURN). Без них звонки работают по STUN (часто достаточно в одной сети).
   
   Файл `.env` в репозиторий не коммитится.
3. Запустить приложение:
   ```bash
   npm run dev
   ```
   Открыть в браузере адрес из вывода (обычно `http://localhost:3000`).

---

## Сборка

```bash
npm run build
```

Результат — папка `dist/`. Превью продакшен-сборки: `npm run preview`.
