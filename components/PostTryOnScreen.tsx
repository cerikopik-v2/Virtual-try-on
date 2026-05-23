import React, { useState, useRef } from 'react';
import { SelectionState } from '../types';
import { CLOTHES, ACCESSORIES_GROUP_1, ACCESSORIES_GROUP_2, POSES, BACKGROUNDS } from '../constants';
import { RefreshCw, Wand2, ImagePlus, Download } from 'lucide-react';
import { generateVirtualTryOnImage } from '../services/geminiService';
import Spinner from './Spinner';

interface Props {
  selection: SelectionState;
  userImageFile: File;
  userImageUrl: string;
  resultImageUrl: string;
  onUpdateResultImage: (url: string) => void;
  onNewTryOn: () => void;
  onRestart: () => void;
}

const PostTryOnScreen: React.FC<Props> = ({ selection, userImageFile, userImageUrl, resultImageUrl, onUpdateResultImage, onNewTryOn, onRestart }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getClothesName = () => CLOTHES.find(c => c.id === selection.clothes)?.name || '';
  const getAccNames = () => {
    const acc1 = ACCESSORIES_GROUP_1.find(a => a.id === selection.accessories[0])?.name;
    const acc2 = ACCESSORIES_GROUP_2.find(a => a.id === selection.accessories[1])?.name;
    return [acc1, acc2].filter(a => a && a !== 'Нет').join(', ') || 'Нет аксессуаров';
  };
  const getPoseName = () => POSES.find(p => p.id === selection.pose)?.name || '';
  const getBgName = () => BACKGROUNDS.find(b => b.id === selection.background)?.name || '';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resultImageUrl;
    link.download = 'generated-outfit.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRepeatTryOn = async () => {
    setIsGenerating(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
       const clothesOption = CLOTHES.find(c => c.id === selection.clothes);
       const accOpts = [ACCESSORIES_GROUP_1.find(a => a.id === selection.accessories[0]), ACCESSORIES_GROUP_2.find(a => a.id === selection.accessories[1])].filter(a => a && a.id !== 'none1' && a.id !== 'none2');
       const poseOption = POSES.find(p => p.id === selection.pose);
       const bgOption = BACKGROUNDS.find(b => b.id === selection.background);

       const options = {
         clothesRef: clothesOption?.refUrl || '',
         clothesName: clothesOption?.name || '',
         clothesId: selection.clothes,
         clothesPrompt: clothesOption?.promptText || null,
         accRefs: accOpts.map(a => a?.refUrl).filter(Boolean) as string[],
         accNames: accOpts.map(a => a?.name).filter(Boolean) as string[],
         poseText: poseOption?.poseText || '',
         bgRef: bgOption?.refUrl || '',
         bgId: selection.background,
         isPendant: selection.accessories.includes('pendant'),
         isSecret: selection.background === 'secret',
         isStudio: selection.background === 'studio',
         isFlag: selection.accessories.includes('flag'),
       };

       const resultUrl = await generateVirtualTryOnImage(userImageFile, options);
       if (!abortControllerRef.current.signal.aborted) {
          // Предзагружаем базо64 строку в браузере, чтобы она не декодировалась на лету
          // и не вызывала "моргание" старого изображения перед новым.
          await new Promise((resolve) => {
             const img = new Image();
             img.onload = resolve;
             img.onerror = resolve; // На случай ошибки загрузки
             img.src = resultUrl;
          });
          onUpdateResultImage(resultUrl);
       }
    } catch (err: any) {
       if (!abortControllerRef.current?.signal.aborted) {
          setError(err.message || 'Ошибка генерации');
       }
    } finally {
       if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          setIsGenerating(false);
       }
    }
  };

  const handleCancelGeneration = () => {
     if (abortControllerRef.current) {
        abortControllerRef.current.abort();
     }
     setIsGenerating(false);
     setError("Генерация отменена");
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto my-auto py-6 md:py-10 px-4 md:px-8 flex flex-col md:flex-row gap-8 md:gap-12 text-gray-900 bg-white">
      
      {/* Left side: Read-only Options */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-medium mb-6">Выберите варианты</h2>
        
        {/* Tabs - disabled look */}
        <div className="grid grid-cols-2 lg:flex gap-2 mb-8 opacity-60 pointer-events-none">
          <button className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded uppercase border bg-red-700 text-white border-red-700">ОДЕЖДА</button>
          <button className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded uppercase border bg-white text-gray-700 border-gray-300">АКСЕССУАРЫ</button>
          <button className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded uppercase border bg-white text-gray-700 border-gray-300">ПОЗА</button>
          <button className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded uppercase border bg-white text-gray-700 border-gray-300">ФОН</button>
        </div>

        {/* Read only view of selected clothes */}
        <div className="flex-1 min-h-[300px] opacity-60 pointer-events-none">
           <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
             {CLOTHES.map(item => (
               <div key={item.id} className={`border-2 rounded-xl overflow-hidden aspect-square relative flex flex-col items-center justify-between p-2 ${selection.clothes === item.id ? 'border-red-500 bg-red-50/10' : 'border-gray-200'}`}>
                 <div className="relative w-full flex-1 min-h-0">
                   <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                   {selection.clothes !== item.id && (
                      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-lg transition-opacity pointer-events-none"></div>
                   )}
                 </div>
                 <span className={`text-xs text-center mt-2 flex-shrink-0 font-medium ${selection.clothes !== item.id ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                 {selection.clothes === item.id && (
                   <div className="absolute top-3 left-3 bg-white rounded-full p-1.5 shadow z-20">
                     <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                   </div>
                 )}
               </div>
             ))}
           </div>
        </div>

        {/* Selected Image Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
           <h3 className="text-base font-medium mb-4">Ваш образ</h3>
           <div className="flex flex-wrap gap-2">
             <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{getClothesName()}</span>
             {getAccNames() !== 'Нет аксессуаров' && getAccNames().split(', ').map((acc, i) => (
                <span key={i} className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{acc}</span>
             ))}
             <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{getPoseName()}</span>
             <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{getBgName()}</span>
           </div>
        </div>
      </div>

      {/* Right side: Result and Action */}
      <div className="flex-1 flex flex-col">
         <div className="relative border border-gray-200 flex-1 w-full max-w-[500px] aspect-[3/4] mx-auto rounded-xl overflow-hidden shadow-sm bg-gray-50 flex items-center justify-center p-2 mb-6">
            <img src={resultImageUrl} alt="Result" className={`w-full h-full object-cover rounded-lg transition-all duration-700 ${isGenerating ? 'brightness-50 blur-sm' : ''}`} />
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                 <Spinner colorClass="text-white" />
                 <p className="mt-4 text-white font-medium drop-shadow-md">Генерация образа...</p>
                 <button
                    onClick={handleCancelGeneration}
                    className="mt-6 px-6 py-2 bg-black/50 hover:bg-black/70 text-white rounded-full text-sm backdrop-blur-md transition-colors"
                 >
                    Отменить
                 </button>
              </div>
            )}
         </div>
         
         {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

         <div className="w-full max-w-[500px] mx-auto flex flex-col gap-3">
             <button 
               onClick={handleRepeatTryOn}
               disabled={isGenerating}
               className="flex items-center justify-center gap-2 w-full bg-[#b91c1c] hover:bg-[#991b1b] disabled:bg-gray-400 text-white py-4 font-bold rounded-xl shadow-lg transition-colors text-sm uppercase tracking-wider"
             >
               <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} /> {isGenerating ? 'ОЖИДАЙТЕ...' : 'ПОВТОРИТЬ ТОТ ЖЕ ОБРАЗ'}
             </button>
             
             <div className="flex flex-col gap-3">
               <div className="flex gap-3">
                  <button 
                    onClick={onNewTryOn}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-1 sm:gap-2 flex-1 border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 py-3 font-semibold rounded-xl transition-all shadow-sm text-[10px] sm:text-xs uppercase"
                  >
                    <Wand2 className="w-3 h-3 sm:w-4 sm:h-4" /> НОВАЯ ПРИМЕРКА
                  </button>
                  <button 
                    onClick={onRestart}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-1 sm:gap-2 flex-1 border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 py-3 font-semibold rounded-xl transition-all shadow-sm text-[10px] sm:text-xs uppercase"
                  >
                    <ImagePlus className="w-3 h-3 sm:w-4 sm:h-4" /> ДРУГОЕ ФОТО
                  </button>
               </div>
               <button 
                 onClick={handleDownload}
                 disabled={isGenerating}
                 className="flex items-center justify-center gap-2 w-full border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-gray-700 py-3 font-semibold rounded-xl transition-all shadow-sm text-xs uppercase"
               >
                 <Download className="w-4 h-4" /> СКАЧАТЬ
               </button>
             </div>
         </div>
      </div>

    </div>
  );
};

export default PostTryOnScreen;
