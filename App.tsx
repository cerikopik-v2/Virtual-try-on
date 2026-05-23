import React, { useState } from 'react';
import IdentificationModal from './components/IdentificationModal';
import StartScreen from './components/StartScreen';
import TryOnScreen from './components/TryOnScreen';
import PostTryOnScreen from './components/PostTryOnScreen';
import { SelectionState } from './types';
import { DEFAULT_SELECTION } from './constants';

type AppView = 'start' | 'tryon' | 'result';

const App: React.FC = () => {
  const [identified, setIdentified] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('start');
  const [autoStartGeneration, setAutoStartGeneration] = useState(false);
  
  // App State
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_SELECTION);
  
  // Result state
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  
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

  return (
    <div className="font-sans bg-gray-50 text-gray-900 min-h-[100dvh] flex flex-col py-4 md:py-8 px-2 md:px-0">
      {!identified && (
        <IdentificationModal onIdentified={() => setIdentified(true)} />
      )}
      
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
      
    </div>
  );
};

export default App;
