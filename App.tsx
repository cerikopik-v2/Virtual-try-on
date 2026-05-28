import React, { useState, useEffect } from 'react';
import IdentificationModal from './components/IdentificationModal';
import StartScreen from './components/StartScreen';
import TryOnScreen from './components/TryOnScreen';
import PostTryOnScreen from './components/PostTryOnScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import LimitExceededScreen from './components/LimitExceededScreen';
import { SelectionState } from './types';
import { DEFAULT_SELECTION } from './constants';

type AppView = 'start' | 'tryon' | 'result';

const App: React.FC = () => {
  // 1. Проверяем, есть ли параметры в ссылке (чтобы показать загрузку, пока идет проверка)
  const [isCheckingLink, setIsCheckingLink] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    return !!(queryParams.get('uid') && queryParams.get('sign'));
  });

  // 2. Проверяем, авторизован ли пользователь (есть ли ID в памяти)
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return !!localStorage.getItem('userId');
  });

  // 3. Состояние кнопки "Понятно"
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const [currentView, setCurrentView] = useState<AppView>('start');
  const [autoStartGeneration, setAutoStartGeneration] = useState(false);
  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  
  // App State
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  // Проверка магической ссылки
  useEffect(() => {
    const verifyMagicLink = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const urlUid = queryParams.get('uid');
      const urlSign = queryParams.get('sign');

      if (urlUid && urlSign) {
        const SECRET_WORD = 'BurServisSecret2026'; 
        const textToHash = urlUid + SECRET_WORD;

        try {
          const msgBuffer = new TextEncoder().encode(textToHash);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          if (hashHex === urlSign) {
            localStorage.setItem('userId', urlUid);
            setIsAuthorized(true);
            // === ПРОВЕРКА ЛИМИТА В REDIS НА СТАРТЕ ===
            try {
              const verifyResponse = await fetch('/api/verify', {
                method: 'POST',
                body: JSON.stringify({ userId: urlUid })
              });
              
              if (verifyResponse.ok) {
                const data = await verifyResponse.json();
                
                // Если юзер исчерпал свои 3 попытки — включаем заглушку
                if (data.generationsCount >= 3) {
                  setIsLimitExceeded(true);
                }
              }
            } catch (err) {
              console.error('Ошибка проверки лимита:', err);
            }
            // === КОНЕЦ БЛОКА ПРОВЕРКИ ===
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Ошибка проверки подписи:', error);
        } finally {
          // Выключаем статус загрузки, когда проверка закончена
          setIsCheckingLink(false);
        }
      }
    };

    verifyMagicLink();
  }, []);
  
  // Handlers
  const handlePhotoUpload = (file: File) => {
    setUserImageFile(file);
    setUserImageUrl(URL.createObjectURL(file));
  };

  const handleStartOver = () => {
    setUserImageFile(null);
    setUserImageUrl(null);
    setResultImageUrl(null);
    setSelection(DEFAULT_SELECTION);
    setAutoStartGeneration(false);
    setCurrentView('start');
  };

  const handleGoToTryOn = () => {
    setAutoStartGeneration(false);
    setCurrentView('tryon');
  };

  const handleTryOnFinish = (url: string) => {
    setResultImageUrl(url);
    setAutoStartGeneration(false);
    setCurrentView('result');
  };

  const handleRepeatTryOn = () => {
    setAutoStartGeneration(true);
    setCurrentView('tryon');
  };
  
  const handleNewTryOn = () => {
    setSelection(DEFAULT_SELECTION);
    setResultImageUrl(null);
    setAutoStartGeneration(false);
    setCurrentView('tryon');
  };

  // Считываем переменную из окружения Vite (0 - работает, 1 - закрыто)
  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === '1';

  if (isMaintenanceMode) {
    // Если 1, рисуем ТОЛЬКО заглушку. Весь интерфейс ниже будет проигнорирован.
    return <MaintenanceScreen />;
  }

  if (isLimitExceeded) {
    // Если лимит исчерпан, рисуем ТОЛЬКО заглушку лимита.
    return <LimitExceededScreen />;
  }
  
  return (
    <div className="font-sans bg-gray-50 text-gray-900 min-h-[100dvh] flex flex-col py-4 md:py-8 px-2 md:px-0">
      
      {/* Состояние 1: Идет криптографическая проверка ссылки */}
      {isCheckingLink && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Проверка доступа...</p>
        </div>
      )}

      {/* Состояние 2: Проверка закончена, но правила не приняты -> Показываем окно */}
      {!isCheckingLink && !rulesAccepted && (
        <IdentificationModal 
          isAuthorized={isAuthorized} 
          onAccept={() => setRulesAccepted(true)} 
        />
      )}

      {/* Состояние 3: Авторизован И нажал "Понятно" -> Показываем интерфейс */}
      {!isCheckingLink && isAuthorized && rulesAccepted && (
        <>
          {currentView === 'start' && (
            <StartScreen 
              userImageUrl={userImageUrl}
              onUpload={handlePhotoUpload}
              onProceed={handleGoToTryOn}
              onReset={handleStartOver}
            />
          )}

          {currentView === 'tryon' && userImageFile && userImageUrl && (
            <TryOnScreen 
              key="tryon-screen"
              userImageFile={userImageFile}
              userImageUrl={userImageUrl}
              selection={selection}
              setSelection={setSelection}
              onGenerateFinish={handleTryOnFinish}
              onRestart={handleStartOver}
              onResetSelection={() => setSelection(DEFAULT_SELECTION)}
              autoStart={autoStartGeneration}
            />
          )}

          {currentView === 'result' && userImageUrl && resultImageUrl && (
            <PostTryOnScreen
              selection={selection}
              userImageFile={userImageFile!}
              userImageUrl={userImageUrl}
              resultImageUrl={resultImageUrl}
              onUpdateResultImage={setResultImageUrl}
              onNewTryOn={handleNewTryOn}
              onRestart={handleStartOver}
            />
          )}
        </>
      )}
      
    </div>
  );
};

export default App;
