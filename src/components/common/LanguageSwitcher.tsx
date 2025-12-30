import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const currentLang = i18n.language;
        let newLang = 'vi';
        if (currentLang === 'vi') newLang = 'en';
        else if (currentLang === 'en') newLang = 'ja';
        else newLang = 'vi'; // ja -> vi (Vòng lặp)
        
        i18n.changeLanguage(newLang);
    };

    const getLabel = () => {
        if (i18n.language === 'en') return 'EN';
        if (i18n.language === 'ja') return 'JA';
        return 'VN';
    };

    return (
        <button 
            onClick={toggleLanguage}
            className="flex items-center space-x-1 text-gray-500 hover:text-indigo-600 transition font-bold text-sm px-3 py-1 rounded-lg hover:bg-gray-100"
            title="Switch Language (VN -> EN -> JA)"
        >
            <Globe size={18} />
            <span>{getLabel()}</span>
        </button>
    );
};

export default LanguageSwitcher;