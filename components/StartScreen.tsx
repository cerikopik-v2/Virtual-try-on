import React, { useRef, useState } from 'react';
import { Compare } from './ui/compare';
import { Upload, Info, ArrowRight, ImagePlus } from 'lucide-react';
import { analyzePhoto } from '../services/geminiService';
import { PhotoAnalysisResult } from '../types';
import Spinner from './Spinner';

interface Props {
  userImageUrl: string | null;
  onUpload: (file: File) => void;
  onProceed: () => void;
  onReset: () => void;
}

const StartScreen: React.FC<Props> = ({ userImageUrl, onUpload, onProceed, onReset }) => {
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shouldAnalyze, setShouldAnalyze] = useState(true);

  const handleUploadClick = () => {
    hiddenFileInput.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // First, show the image locally
      onUpload(file);
      setAnalysisResult(null);
      setErrorMsg(null);

      if (!shouldAnalyze) {
          return;
      }

      setIsAnalyzing(true);
      
      try {
         const result = await analyzePhoto(file);
         setAnalysisResult(result);
      } catch (err) {
         console.error(err);
         setErrorMsg("Не удалось проанализировать фотографию");
      } finally {
         setIsAnalyzing(false);
      }
    }
  };

  const getScoreColor = (score?: number) => {
     if (!score) return 'bg-gray-500';
     if (score >= 8) return 'bg-green-500';
     if (score >= 5) return 'bg-yellow-500';
     return 'bg-red-500';
  };

  return (
    <div className={`max-w-[1200px] w-full min-h-[600px] mx-auto my-auto py-8 md:py-20 px-4 md:px-8 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 text-gray-900`}>
      
      {/* Left side */}
      <div className={`flex-1 flex flex-col justify-center ${userImageUrl ? 'order-2 md:order-1' : ''}`}>
        <h1 className={`text-[1.8rem] sm:text-4xl md:text-5xl font-[800] uppercase tracking-tight leading-none mb-4 whitespace-nowrap text-center md:text-left ${userImageUrl ? 'hidden md:block' : ''}`}>В СТИЛЕ БУРСЕРВИС</h1>
        <h2 className={`text-xl md:text-2xl font-medium text-gray-500 mb-10 text-center md:text-left ${userImageUrl ? 'hidden md:block' : ''}`}>Виртуальная примерочная</h2>

        {!userImageUrl ? (
          <>
            <div className="flex flex-col mb-8 gap-3">
              <button 
                onClick={handleUploadClick}
                className="flex items-center justify-center gap-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white w-full sm:w-80 py-4 font-bold rounded-xl shadow-lg transition-colors text-lg uppercase tracking-wide"
              >
                <Upload className="w-5 h-5" />
                ЗАГРУЗИТЬ ФОТО
              </button>
              <label className="flex items-center gap-2 cursor-pointer w-fit text-sm text-gray-700 mx-auto sm:mx-0">
                 <input type="checkbox" checked={shouldAnalyze} onChange={(e) => setShouldAnalyze(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer" />
                 Анализ фото на успешность примерки
              </label>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={hiddenFileInput} 
              style={{display: 'none'}} 
              onChange={handleFileChange} 
            />
          </>
        ) : (
           <>
             <div className="flex flex-col mb-8">
               <div className="flex flex-col sm:flex-row gap-4 mb-4">
                 <button 
                   onClick={onProceed}
                   disabled={isAnalyzing || (analysisResult && !analysisResult.isAllowed)}
                   className="flex items-center justify-center gap-2 bg-[#b91c1c] hover:bg-[#991b1b] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-8 py-4 font-bold rounded-xl shadow-lg transition-colors text-sm sm:text-base uppercase tracking-wide"
                 >
                   <ArrowRight className="w-5 h-5" />
                   К ПРИМЕРКЕ
                 </button>
                 <button 
                    onClick={handleUploadClick}
                    disabled={isAnalyzing}
                    className="flex items-center justify-center gap-2 bg-transparent border-2 border-gray-800 text-gray-800 hover:bg-gray-100 px-8 py-4 font-bold rounded-xl shadow-sm transition-colors text-sm sm:text-base uppercase tracking-wide disabled:opacity-50"
                 >
                   <ImagePlus className="w-5 h-5" />
                   ДРУГОЕ ФОТО
                 </button>
                 <input 
                  type="file" 
                  accept="image/*" 
                  ref={hiddenFileInput} 
                  style={{display: 'none'}} 
                  onChange={handleFileChange} 
                 />
               </div>
               <label className="flex items-center gap-2 cursor-pointer w-fit text-sm text-gray-700">
                  <input type="checkbox" checked={shouldAnalyze} onChange={(e) => setShouldAnalyze(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer" />
                  Анализ фото на успешность примерки
               </label>
             </div>
             {analysisResult && !analysisResult.isAllowed && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-md">
                   <p className="font-semibold text-red-700">Фотография недопустима</p>
                   <p className="text-red-600 text-sm">{analysisResult.reason}</p>
                </div>
             )}
             {errorMsg && (
                 <p className="text-red-500 text-sm mb-6">{errorMsg}</p>
             )}
           </>
        )}

        {/* Блок вынесен из условий и теперь отображается ВСЕГДА в одном и том же месте */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 text-xs text-gray-700 leading-relaxed shadow-sm max-w-md mx-auto md:mx-0">
           <h3 className="font-bold mb-2 text-gray-900">Рекомендации к фото:</h3>
           <ul className="list-disc pl-5 space-y-1 mb-4">
             <li>Портрет по пояс или крупнее. Не в полный рост!</li>
             <li>Лицо четко видно, взгляд прямо (анфас), глаза открыты.</li>
             <li>Один человек в кадре.</li>
             <li>Высокое качество, без размытия и сильных фильтров.</li>
           </ul>
        </div>
      </div>

      {/* Right side */}
      <div className={`flex-1 flex justify-center items-center ${userImageUrl ? 'order-1 md:order-2 w-full max-w-[400px] md:max-w-none mx-auto' : ''}`}>
        {!userImageUrl ? (
           <div className="w-full max-w-[400px] aspect-[3/4] border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white relative">
             <div className="absolute top-4 left-4 z-10 bg-white/80 px-2 py-1 rounded text-xs text-gray-500 font-mono">Фото до</div>
             <div className="absolute top-4 right-4 z-10 bg-white/80 px-2 py-1 rounded text-xs text-gray-500 font-mono">Фото после</div>
              <Compare 
                firstImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon.jpg"
                secondImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon-model.png"
                className="w-full h-full"
                slideMode="drag"
              />
           </div>
        ) : (
          <div className="w-full max-w-[400px] aspect-[3/4] border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-100 flex items-center justify-center p-2 relative">
            <img src={userImageUrl} alt="Uploaded" className={`w-full h-full object-cover rounded-lg transition-all ${isAnalyzing ? 'blur-sm brightness-75' : ''}`} />
            
            {isAnalyzing && (
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <Spinner colorClass="text-white" />
                 <span className="mt-4 text-white font-medium text-sm drop-shadow-md">Анализ фото...</span>
               </div>
            )}

            {!isAnalyzing && analysisResult && analysisResult.isAllowed && analysisResult.score && (
              <div className={`absolute top-4 right-4 ${getScoreColor(analysisResult.score)} text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 max-w-[80%]`}>
                 <div className="font-bold whitespace-nowrap">{analysisResult.score} / 10</div>
                 <div className="text-[10px] leading-tight border-l border-white/30 pl-2">
                    {analysisResult.qualityMessage}
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
      
    </div>
  );
};

export default StartScreen;
