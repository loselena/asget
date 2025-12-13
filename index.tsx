
import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Corrected import path for App component.
import App from './App';

// Инициализация Firebase происходит автоматически при первом импорте
// модуля services/firebase.ts внутри дерева компонентов (например, в App.tsx).
// Явный вызов здесь не нужен и приводил к ошибке.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
