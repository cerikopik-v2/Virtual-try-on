import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  onIdentified: () => void;
}

const IdentificationModal: React.FC<Props> = ({ onIdentified }) => {
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const checkId = () => {
    if (userId.toLowerCase() === 'hx28103') {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        onIdentified();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, onIdentified]);

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
        <div className="bg-white rounded-xl shadow-lg px-8 py-6 flex items-center gap-4 animate-in fade-in zoom-in duration-200">
          <CheckCircle2 className="w-6 h-6 text-gray-900" />
          <h2 className="text-sm font-medium uppercase tracking-widest text-gray-900">
            Доступ разрешен
          </h2>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full mx-4 text-center transform transition-all">
          <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900 mb-6">ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Для прохождения проверки, вы также должны быть подписчиком нашего корпоративного портала "Бурсервис-LIFE"
            <br/><br/>
            Если вы не являетесь подписчиком, просто перейдите по <a href="https://life.burservis.ru/" target="_blank" rel="noreferrer" className="text-[#b91c1c] font-bold underline hover:text-[#991b1b] transition-colors">ССЫЛКЕ</a> на сайт и авторизуйтесь. Затем вернитесь к окну идентификации.
          </p>
          <a href="https://life.burservis.ru/" target="_blank" rel="noreferrer" className="inline-flex justify-center flex items-center gap-2 w-full bg-[#b91c1c] hover:bg-[#991b1b] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
            ССЫЛКА НА САЙТ
          </a>
          <button onClick={() => setStatus('idle')} className="mt-6 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">Назад</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center py-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 max-w-xl w-full mx-4 transform transition-all my-auto max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-gray-900 mb-4 sm:mb-6">ВНИМАНИЕ</h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed mb-6 sm:mb-8">
          <p>Для использования нашего сервиса, вам необходимо идентифицировать себя.</p>
          <p>Это сделано в целях ограничения попыток генераций, поскольку они не бесплатны, мы вынуждены ограничить количество генераций до трех штук на одного пользователя.</p>
          <p>Для идентификации, пожалуйста, введите в поле ниже ваш user ID, например (h23045, b98432, n073672).</p>
          <p>Для успешного прохождения проверки, вы также должны быть подписчиком нашего корпоративного портала "Бурсервис-LIFE".</p>
          <p>Если вы не являетесь подписчиком, просто перейдите по <a href="https://life.burservis.ru/" target="_blank" rel="noreferrer" className="text-[#b91c1c] font-bold underline hover:text-[#991b1b] transition-colors">ССЫЛКЕ</a> на сайт и авторизуйтесь. Затем вернитесь к этому окну.</p>
          <p className="text-[#b91c1c] font-semibold">Пожалуйста, используйте только свой user ID!</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Введите ваш User ID" 
            className="flex-grow px-4 py-3 sm:py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:bg-white focus:outline-none transition-all outline-none"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button 
            onClick={checkId}
            className="flex items-center justify-center gap-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl shadow-lg transition-all uppercase tracking-wider text-sm sm:text-base"
          >
            <CheckCircle2 className="w-5 h-5" />
            ПРОВЕРИТЬ
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentificationModal;
