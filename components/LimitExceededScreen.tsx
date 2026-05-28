// components/LimitExceededScreen.tsx
import React from 'react';
import { AlertOctagon } from 'lucide-react';

const LimitExceededScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 relative overflow-hidden border border-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <AlertOctagon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Лимит исчерпан</h2>
          <p className="text-gray-600 mb-2 leading-relaxed">
            Вы использовали все доступные генерации по этой ссылке.
            <br /><br />
            Если лимиты будут увеличены, мы сообщим об этом дополнительно.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LimitExceededScreen;
