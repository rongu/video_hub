import i18n from '../../i18n'; // Import instance i18next
import {type MultilingualField} from './config'; // Import instance i18next

/**
 * Hàm lấy nội dung theo ngôn ngữ hiện tại
 * @param content: Dữ liệu từ DB (có thể là string hoặc object)
 * @param langCode: Ngôn ngữ muốn lấy (mặc định lấy từ i18n.language)
 */
export const tr_h = (content: MultilingualField | undefined, langCode?: string): string => {
    if (!content) return "";

    // 1. Nếu là String (Dữ liệu cũ) -> Trả về nguyên gốc
    if (typeof content === 'string') {
        return content;
    }

    // 2. Nếu là Object (Dữ liệu mới)
    const currentLang = langCode || i18n.language; // 'vi' hoặc 'ja'

    // Ưu tiên lấy đúng ngôn ngữ
    if (currentLang === 'ja' && content.ja) {
        return content.ja;
    }
    
    // Nếu English được enable sau này
    if (currentLang === 'en' && content.en) {
        return content.en;
    }

    // 3. Fallback: Luôn trả về tiếng Việt nếu không tìm thấy ngôn ngữ kia
    return content.vi || "";
};