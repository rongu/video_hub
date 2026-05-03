import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const currentLang = i18n.language;
        
        // [UPDATE] Logic chỉ switch giữa VI và JA
        // Nếu đang là VI -> Sang JA
        // Nếu đang là JA -> Sang VI
        // Nếu đang là EN (hoặc khác) -> Về VI
        const newLang = currentLang === 'vi' ? 'ja' : 'vi';
        
        i18n.changeLanguage(newLang);
    };

    const getLabel = () => {
        if (i18n.language === 'ja') return 'JA';
        // Mặc định hiển thị VN
        return 'VN';
    };

    return (
        <button 
            onClick={toggleLanguage}
            className="flex items-center space-x-1 text-gray-600 hover:text-[#1A73E8] transition font-semibold text-sm px-3 py-1 rounded-lg hover:bg-blue-50"
            title="Đổi ngôn ngữ (VN <-> JA)"
        >
            <Globe size={18} />
            <span>{getLabel()}</span>
        </button>
    );
};

export default LanguageSwitcher;