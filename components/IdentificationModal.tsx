import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  isAuthorized: boolean;
  onAccept: () => void;
}

const IdentificationModal: React.FC<Props> = ({ isAuthorized, onAccept }) => {
  
  // Состояние 1: Доступ закрыт (пытается зайти без магической ссылки)
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full mx-4 text-center transform transition-all">
          <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900 mb-6">ДОСТУП ЗАКРЫТ</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Для использования примерочной вы должны перейти по специальной защищенной ссылке с нашего корпоративного портала "Бурсервис-LIFE".
            <br/><br/>
            Прямой доступ по ссылке невозможен в целях безопасности.
          </p>
          <a 
            href="https://life.burservis.ru/" 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex justify-center flex items-center gap-2 w-full bg-[#b91c1c] hover:bg-[#991b1b] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all uppercase tracking-wider text-sm sm:text-base"
          >
            ПЕРЕЙТИ НА ПОРТАЛ
          </a>
        </div>
      </div>
    );
  }

  // Состояние 2: Доступ разрешен (показываем правила)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center py-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 max-w-xl w-full mx-4 transform transition-all my-auto max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-gray-900 mb-4 sm:mb-6">ПРАВИЛА ИСПОЛЬЗОВАНИЯ</h2>
        
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed mb-6 sm:mb-8">
          <p>Добро пожаловать в виртуальную примерочную Бурсервис! Перед началом работы ознакомьтесь с правилами:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Используйте только четкие фотографии анфас с хорошим освещением.</li>
            <li>Не используйте чужие личные фотографии.</li>
            <li>В целях оптимизации нагрузки установлен лимит генераций. Ваш лимит строго привязан к вашему аккаунту на портале.</li>
          </ul>
          <p className="text-[#b91c1c] font-semibold mt-4">Приятного использования!</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onAccept}
            className="flex w-full items-center justify-center gap-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl shadow-lg transition-all uppercase tracking-wider text-sm sm:text-base"
          >
            <CheckCircle2 className="w-5 h-5" />
            ПОНЯТНО, НАЧАТЬ РАБОТУ
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentificationModal;
