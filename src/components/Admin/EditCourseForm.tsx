import React, { useState } from 'react';
import { type Course, updateCourse, tr_h } from '../../services/firebase'; 
import { type MultilingualField } from '../../services/firebase/config'; // [NEW] Import Type
import { Loader2, X, Save } from 'lucide-react';

interface EditCourseFormProps {
    course: Course;
    onCourseUpdated: () => void;
    onClose: () => void;
}

const EditCourseForm: React.FC<EditCourseFormProps> = ({ course, onCourseUpdated, onClose }) => {
    // Helper để lấy text gốc của từng ngôn ngữ để đưa vào ô input
    const getRaw = (field: MultilingualField | undefined, lang: 'vi' | 'ja'): string => {
        if (!field) return '';
        // Nếu là string cũ -> coi là Tiếng Việt
        if (typeof field === 'string') {
            return lang === 'vi' ? field : '';
        }
        // Nếu là object -> lấy đúng key
        return field[lang] || '';
    };

    // State cho Tiếng Việt (Gốc)
    const [title, setTitle] = useState(getRaw(course.title, 'vi'));
    const [description, setDescription] = useState(getRaw(course.description, 'vi'));
    
    // State cho Tiếng Nhật (Mới)
    const [titleJa, setTitleJa] = useState(getRaw(course.title, 'ja'));
    const [descriptionJa, setDescriptionJa] = useState(getRaw(course.description, 'ja'));

    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Chỉ bắt buộc nhập Tiếng Việt
        if (!title.trim() || !description.trim()) {
            setError("Tiêu đề và Mô tả (Tiếng Việt) không được để trống.");
            return;
        }

        setIsUpdating(true);

        try {
            // [UPDATE] Gom dữ liệu thành Object đa ngôn ngữ
            const updateData = {
                title: { 
                    vi: title, 
                    ja: titleJa || title // Fallback: Nếu không nhập JA thì lấy VI
                } as MultilingualField,
                description: { 
                    vi: description, 
                    ja: descriptionJa || description 
                } as MultilingualField
            };

            await updateCourse(course.id, updateData);
            
            setSuccess('Cập nhật khóa học thành công!');
            onCourseUpdated(); 
            setTimeout(onClose, 1000); 
        } catch (err: any) {
            console.error("Lỗi khi cập nhật Khóa học:", err);
            setError(`Cập nhật thất bại. Lỗi: ${err.message || "Vui lòng kiểm tra kết nối mạng và quy tắc Firestore."}`);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-6 border-t-8 border-yellow-500">
            <div className="flex justify-between items-start border-b pb-3">
                {/* [UPDATE] Dùng tr_h() để hiển thị tiêu đề theo ngôn ngữ đang chọn */}
                <h3 className="text-2xl font-bold text-yellow-700">Chỉnh sửa Khóa học: {tr_h(course.title)}</h3>
                <button 
                    onClick={onClose} 
                    className="text-gray-500 hover:text-gray-800 transition p-1 rounded-full hover:bg-gray-100"
                    disabled={isUpdating}
                >
                    <X size={24} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200">{error}</p>}
                {success && <p className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200">{success}</p>}

                {/* --- SECTON: TIẾNG VIỆT (BẮT BUỘC) --- */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center">
                        🇻🇳 Tiếng Việt <span className="ml-2 text-xs font-normal text-gray-500">(Mặc định)</span>
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-title">Tiêu đề <span className="text-red-500">*</span></label>
                        <input
                            id="edit-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-yellow-500 focus:border-yellow-500"
                            placeholder="Nhập tiêu đề tiếng Việt..."
                            disabled={isUpdating}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-description">Mô tả <span className="text-red-500">*</span></label>
                        <textarea
                            id="edit-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            required
                            className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                            placeholder="Mô tả ngắn gọn tiếng Việt..."
                            disabled={isUpdating}
                        />
                    </div>
                </div>

                {/* --- SECTON: TIẾNG NHẬT (TÙY CHỌN) --- */}
                <div className="space-y-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wider flex items-center">
                        🇯🇵 Tiếng Nhật <span className="ml-2 text-xs font-normal text-indigo-500">(Tùy chọn)</span>
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề (JA)</label>
                        <input
                            type="text"
                            value={titleJa}
                            onChange={(e) => setTitleJa(e.target.value)}
                            className="block w-full border border-indigo-200 rounded-lg shadow-sm p-2.5 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            placeholder="Nhập tiêu đề tiếng Nhật..."
                            disabled={isUpdating}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả (JA)</label>
                        <textarea
                            value={descriptionJa}
                            onChange={(e) => setDescriptionJa(e.target.value)}
                            rows={3}
                            className="block w-full border border-indigo-200 rounded-lg shadow-sm p-2.5 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                            placeholder="Mô tả tiếng Nhật..."
                            disabled={isUpdating}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isUpdating || !title.trim() || !description.trim()} 
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white transition duration-150 
                        bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUpdating ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                        <Save size={20} className="mr-2"/>
                    )}
                    {isUpdating ? 'Đang Cập Nhật...' : 'Lưu Thay Đổi'}
                </button>
            </form>
        </div>
    );
};

export default EditCourseForm;