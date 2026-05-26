import React, { useState, useRef, useEffect } from 'react';
import { Category, SelectionState } from '../types';
import { CLOTHES, ACCESSORIES_GROUP_1, ACCESSORIES_GROUP_2, POSES, BACKGROUNDS, DEFAULT_SELECTION } from '../constants';
import { generateVirtualTryOnImage } from '../services/geminiService';
import Spinner from './Spinner';
import { Sparkles, Home, RotateCcw } from 'lucide-react';

interface Props {
  userImageFile: File;
  userImageUrl: string;
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
  onGenerateFinish: (url: string) => void;
  onRestart: () => void;
  onResetSelection: () => void;
  autoStart?: boolean;
}

const TryOnScreen: React.FC<Props> = ({ userImageFile, userImageUrl, selection, setSelection, onGenerateFinish, onRestart, onResetSelection, autoStart }) => {
  const [activeTab, setActiveTab] = useState<Category>('clothes');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationLogs, setGenerationLogs] = useState<string>('');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
     if (autoStart) {
         handleTryOn();
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Constraints
  const isPendantSelected = selection.accessories.includes('pendant');
  const isFlagSelected = selection.accessories.includes('flag');
  const isPendantOrFlagSelected = isPendantSelected || isFlagSelected;
  const isSecretLocationSelected = selection.background === 'secret';
  const isStudioSelected = selection.background === 'studio';

  const isCustomPoseSelected = selection.pose !== 'neutral';

  const handleSelectClothes = (id: string) => setSelection(prev => ({ ...prev, clothes: id }));
  
  const handleSelectAcc1 = (id: string) => {
    setSelection(prev => {
      const newAcc = [...prev.accessories];
      newAcc[0] = id;
      return { ...prev, accessories: newAcc };
    });
  };
  
  const handleSelectAcc2 = (id: string) => {
    setSelection(prev => {
      let newAcc = [...prev.accessories];
      // If pendant or flag is selected, we disable pose and bg, maybe reset them? The requirement says they become unavailable.
      if (id === 'pendant' || id === 'flag') {
        return { ...prev, accessories: [newAcc[0], id], pose: DEFAULT_SELECTION.pose, background: DEFAULT_SELECTION.background };
      }
      return { ...prev, accessories: [newAcc[0], id] };
    });
  };

  const handleSelectPose = (id: string) => {
    if (isPendantOrFlagSelected || isSecretLocationSelected || isStudioSelected) return;
    setSelection(prev => {
      return { ...prev, pose: id };
    });
  };

  const handleSelectBg = (id: string) => {
    if (isPendantOrFlagSelected) return;
    
    setSelection(prev => {
      if (id === 'secret' || id === 'studio') {
         return { ...prev, background: id, pose: DEFAULT_SELECTION.pose };
      }
      return { ...prev, background: id };
    });
  };

  const handleTryOn = async () => {
    setIsGenerating(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    try {
       // Find names for options to pass to gemini
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
         onLog: (msg: string) => setGenerationLogs(msg),
       };

      const resultUrl = await generateVirtualTryOnImage(userImageFile, options);
       if (!abortControllerRef.current.signal.aborted) {
          onGenerateFinish(resultUrl);
       }
    } catch (err: any) {
       if (!abortControllerRef.current?.signal.aborted) {
          if (err.message === 'LIMIT_EXCEEDED') {
             setError('Превышен лимит! Вы израсходовали свои генерации.');
          } else {
             setError(err.message || 'Ошибка генерации');
          }
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

  const getClothesName = () => CLOTHES.find(c => c.id === selection.clothes)?.name || '';
  const getAccNames = () => {
    const acc1 = ACCESSORIES_GROUP_1.find(a => a.id === selection.accessories[0])?.name;
    const acc2 = ACCESSORIES_GROUP_2.find(a => a.id === selection.accessories[1])?.name;
    return [acc1, acc2].filter(a => a && a !== 'Нет').join(', ') || 'Нет аксессуаров';
  };
  const getPoseName = () => POSES.find(p => p.id === selection.pose)?.name || '';
  const getBgName = () => BACKGROUNDS.find(b => b.id === selection.background)?.name || '';

  return (
    <div className="max-w-[1200px] w-full mx-auto my-auto py-6 md:py-10 px-4 md:px-8 flex flex-col md:flex-row gap-8 md:gap-12 text-gray-900 bg-white">
      
      {/* Left side: Options */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-medium mb-6">Выберите варианты</h2>
        
        {/* Tabs */}
        <div className="grid grid-cols-2 lg:flex gap-2 mb-8">
          <button 
             onClick={() => setActiveTab('clothes')} 
             className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded uppercase border ${activeTab === 'clothes' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            ОДЕЖДА
          </button>
          <button 
             onClick={() => setActiveTab('accessories')} 
             className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded uppercase border ${activeTab === 'accessories' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            АКСЕССУАРЫ
          </button>
          <div className="relative flex-1 group min-w-0">
             <button 
                onClick={() => !isPendantOrFlagSelected && setActiveTab('background')} 
                disabled={isPendantOrFlagSelected}
                className={`w-full py-2 text-xs sm:text-sm font-semibold rounded uppercase border ${activeTab === 'background' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
             >
               ФОН
             </button>
             {isPendantOrFlagSelected && (
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                 Недоступно при выборе {isPendantSelected ? 'подвески' : 'флага'}
               </div>
             )}
          </div>
          <div className="relative flex-1 group min-w-0">
             <button 
                onClick={() => !isPendantOrFlagSelected && setActiveTab('pose')} 
                disabled={isPendantOrFlagSelected || isSecretLocationSelected || isStudioSelected}
                className={`w-full py-2 text-xs sm:text-sm font-semibold rounded uppercase border ${activeTab === 'pose' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
             >
               ПОЗА
             </button>
             {(isPendantOrFlagSelected || isSecretLocationSelected || isStudioSelected) && (
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                 {isPendantSelected ? 'Недоступно при выборе подвески' : isFlagSelected ? 'Недоступно при выборе флага' : 'Недоступно при выбранном фоне'}
               </div>
             )}
          </div>
        </div>

        {/* Option Grid */}
        <div className="flex-1 min-h-[300px]">
           {activeTab === 'clothes' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {CLOTHES.map(item => (
                   <div 
                     key={item.id} 
                     onClick={() => handleSelectClothes(item.id)}
                     className={`cursor-pointer border-2 rounded-xl overflow-hidden aspect-square relative flex flex-col items-center justify-between p-2 ${selection.clothes === item.id ? 'border-red-500 bg-red-50/10' : 'border-gray-200 hover:border-gray-300'} transition-all`}
                   >
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
           )}

           {activeTab === 'accessories' && (
              <div className="space-y-6">
                <div>
                   <h3 className="text-sm font-medium text-gray-500 mb-3">Группа 1</h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {ACCESSORIES_GROUP_1.map(item => (
                       <div 
                         key={item.id} 
                         onClick={() => handleSelectAcc1(item.id)}
                         className={`cursor-pointer border-2 rounded-xl overflow-hidden aspect-square relative flex flex-col items-center justify-between p-2 ${selection.accessories[0] === item.id ? 'border-red-500 bg-red-50/10' : 'border-gray-200 hover:border-gray-300'} transition-all`}
                       >
                         <div className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-gray-50 rounded-lg">
                           <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain rounded-lg border border-gray-100" />
                           {selection.accessories[0] !== item.id && (
                              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-lg transition-opacity pointer-events-none"></div>
                           )}
                         </div>
                         <span className={`text-xs text-center mt-2 flex-shrink-0 font-medium ${selection.accessories[0] !== item.id ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                         {selection.accessories[0] === item.id && (
                           <div className="absolute top-3 left-3 bg-white rounded-full p-1.5 shadow z-20">
                             <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
                <div>
                   <h3 className="text-sm font-medium text-gray-500 mb-3">Группа 2</h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {ACCESSORIES_GROUP_2.map(item => (
                       <div 
                         key={item.id} 
                         onClick={() => handleSelectAcc2(item.id)}
                         className={`border-2 rounded-xl overflow-hidden aspect-square relative flex flex-col items-center justify-between p-2 ${(selection.accessories[1] === item.id) ? 'border-red-500 bg-red-50/10' : 'border-gray-200'} cursor-pointer hover:border-gray-300 transition-all`}
                       >
                         <div className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-gray-50 rounded-lg">
                           <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain rounded-lg border border-gray-100" />
                           {selection.accessories[1] !== item.id && (
                              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-lg transition-opacity pointer-events-none"></div>
                           )}
                         </div>
                         <span className={`text-xs text-center mt-2 flex-shrink-0 font-medium ${selection.accessories[1] !== item.id ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                         {selection.accessories[1] === item.id && (
                           <div className="absolute top-3 left-3 bg-white rounded-full p-1.5 shadow z-20">
                             <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
              </div>
           )}

           {activeTab === 'pose' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {POSES.map(item => (
                   <div 
                     key={item.id} 
                     onClick={() => handleSelectPose(item.id)}
                     className={`cursor-pointer border-2 rounded-xl overflow-hidden aspect-square relative flex flex-col items-center justify-between p-2 ${selection.pose === item.id ? 'border-red-500 bg-red-50/10' : 'border-gray-200 hover:border-gray-300'} transition-all`}
                   >
                     <div className="relative w-full flex-1 min-h-0">
                       <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                       {selection.pose !== item.id && (
                          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-lg transition-opacity pointer-events-none"></div>
                       )}
                     </div>
                     <span className={`text-xs text-center mt-2 flex-shrink-0 font-medium ${selection.pose !== item.id ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                     {selection.pose === item.id && (
                       <div className="absolute top-3 left-3 bg-white rounded-full p-1.5 shadow z-20">
                         <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                       </div>
                     )}
                   </div>
                 ))}
              </div>
           )}

           {activeTab === 'background' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {BACKGROUNDS.map(item => {
                   return (
                   <div 
                     key={item.id} 
                     onClick={() => handleSelectBg(item.id)}
                     className={`cursor-pointer border-2 rounded-xl overflow-hidden aspect-square relative flex flex-col items-center justify-between p-2 ${selection.background === item.id ? 'border-red-500 bg-red-50/10' : 'border-gray-200 hover:border-gray-300'} transition-all group`}
                   >
                     <div className="relative w-full flex-1 min-h-0">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        {selection.background !== item.id && (
                          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-lg transition-opacity pointer-events-none"></div>
                        )}
                     </div>
                     <span className={`text-xs text-center mt-2 flex-shrink-0 font-medium ${selection.background !== item.id ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                     {selection.background === item.id && (
                       <div className="absolute top-3 left-3 bg-white rounded-full p-1.5 shadow z-20">
                         <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                       </div>
                     )}

                   </div>
                   );
                 })}
              </div>
           )}
        </div>

        {/* Selected Image Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
           <h3 className="text-base font-medium mb-4">Ваш образ</h3>
           <div className="flex flex-wrap gap-2">
             <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{getClothesName()}</span>
             {getAccNames() !== 'Нет аксессуаров' && getAccNames().split(', ').map((acc, i) => (
                <span key={i} className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{acc}</span>
             ))}
             {!isPendantOrFlagSelected && (
               <>
                 <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{getPoseName()}</span>
                 <span className="px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">{getBgName()}</span>
               </>
             )}
           </div>
        </div>
      </div>

      {/* Right side: Preview and Action */}
      <div className="flex-1 flex flex-col">
         <div className="relative border border-gray-200 flex-1 w-full max-w-[500px] aspect-[3/4] mx-auto rounded-xl overflow-hidden shadow-sm bg-gray-50 flex items-center justify-center p-2 mb-6">
            <img src={userImageUrl} alt="Preview" className={`w-full h-full object-cover rounded-lg transition-all duration-700 ${isGenerating ? 'brightness-50 blur-sm' : ''}`} />
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <Spinner colorClass="text-white" />
                 <p className="mt-4 text-white font-medium drop-shadow-md">Генерация образа...</p>
                 <button
                    onClick={handleCancelGeneration}
                    className="mt-4 text-white/80 hover:text-white underline text-sm z-30 drop-shadow-md cursor-pointer"
                 >
                    Остановить генерацию
                 </button>
              </div>
            )}
         </div>
         {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
         
         <div className="flex gap-4 w-full max-w-[500px] mx-auto">
             <button 
               onClick={onRestart}
               disabled={isGenerating}
               className="h-14 w-14 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors shrink-0 disabled:opacity-50"
               title="На главную"
             >
               <Home className="w-6 h-6" />
             </button>
             
             <button 
               onClick={handleTryOn}
               disabled={isGenerating}
               className="flex-1 bg-[#b91c1c] hover:bg-[#991b1b] disabled:bg-gray-400 text-white h-14 font-bold rounded-xl shadow-lg transition-colors text-[13px] sm:text-lg uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-2"
             >
               {isGenerating ? 'Ожидайте...' : (
                 <>
                   <Sparkles className="w-5 h-5" /> ПРИМЕРИТЬ
                 </>
               )}
             </button>
             
             <button 
               onClick={onResetSelection}
               disabled={isGenerating}
               className="h-14 w-14 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors shrink-0 disabled:opacity-50"
               title="Сбросить настройки"
             >
               <RotateCcw className="w-6 h-6" />
             </button>
          </div>
      </div>

    </div>
  );
};

export default TryOnScreen;

