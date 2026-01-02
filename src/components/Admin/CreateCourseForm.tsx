import React, { useState, useEffect, useCallback } from 'react';
import { type User } from 'firebase/auth';
import { 
    type Course, 
    addCourse, 
    updateCourse, 
    uploadCourseImage, 
    type MultilingualField 
} from '../../services/firebase';
import { Loader2, Image as ImageIcon, X, Eye, Edit2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CreateCourseFormProps {
    user: User;
    initialCourse: Course | null; 
    onCourseSaved: () => void; 
    onCancel?: () => void; // Thêm props onCancel để đóng form đẹp hơn nếu muốn
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ user, initialCourse, onCourseSaved, onCancel }) => {
    // --- STATE TIẾNG VIỆT (GỐC) ---
    const [title, setTitle] = useState('');     
    const [desc, setDesc] = useState('');       
    
    // --- STATE TIẾNG NHẬT (MỚI) ---
    const [titleJa, setTitleJa] = useState(''); 
    const [descJa, setDescJa] = useState('');   

    // --- STATE HÌNH ẢNH ---
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // --- STATE UI & MARKDOWN ---
    const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isEditing = !!initialCourse;

    // --- KHỞI TẠO DỮ LIỆU ---
    useEffect(() => {
        if (initialCourse) {
            // Helper bóc tách dữ liệu đa ngôn ngữ
            const getRaw = (field: MultilingualField | undefined, lang: 'vi'|'ja') => {
                if (!field) return '';
                if (typeof field === 'string') return lang === 'vi' ? field : ''; 
                return field[lang] || '';
            };

            setTitle(getRaw(initialCourse.title, 'vi'));
            setTitleJa(getRaw(initialCourse.title, 'ja'));
            
            setDesc(getRaw(initialCourse.description, 'vi'));
            setDescJa(getRaw(initialCourse.description, 'ja'));

            setPreviewUrl(initialCourse.imageUrl || null);
            setImageFile(null); 
        } else {
            // Reset form
            setTitle(''); setTitleJa('');
            setDesc(''); setDescJa('');
            setPreviewUrl(null);
            setImageFile(null);
        }
    }, [initialCourse]);

    // --- XỬ LÝ ẢNH ---
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file)); 
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setPreviewUrl(null);
    };

    // --- XỬ LÝ SUBMIT ---
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate Tiếng Việt (Bắt buộc)
        if (!title.trim() || !desc.trim()) {
            setError("Vui lòng điền đầy đủ Tiêu đề và Mô tả (Tiếng Việt).");
            return;
        }

        setLoading(true);

        try {
            let imageUrl = initialCourse?.imageUrl;

            // Upload ảnh mới nếu có
            if (imageFile) {
                imageUrl = await uploadCourseImage(imageFile);
            }

            // [UPDATE] Gom dữ liệu thành Object Đa ngôn ngữ
            const courseData: any = { 
                title: {
                    vi: title,
                    ja: titleJa || title // Fallback JA -> VI
                } as MultilingualField,
                description: {
                    vi: desc,
                    ja: descJa || desc // Fallback JA -> VI
                } as MultilingualField,
                adminId: user.uid,
                imageUrl: imageUrl, 
                updatedAt: Date.now()
            };

            if (isEditing && initialCourse?.id) {
                await updateCourse(initialCourse.id, courseData);
                console.log(`Khóa học ${initialCourse.id} đã được cập nhật.`);
            } else {
                await addCourse(courseData);
                console.log('Khóa học mới đã được tạo.');
            }
            
            onCourseSaved();
        } catch (err: any) {
            console.error("Lỗi lưu khóa học:", err);
            setError(err.message || "Có lỗi xảy ra khi lưu khóa học.");
        } finally {
            setLoading(false);
        }
    }, [title, desc, titleJa, descJa, imageFile, isEditing, initialCourse, user, onCourseSaved]);

    return (
        // [UI UPDATE] Thêm khung trắng, đổ bóng để dễ nhìn hơn
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* HEADER */}
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight flex items-center">
                        {isEditing ? <Edit2 className="mr-2" size={24} /> : <Plus className="mr-2" size={24} />}
                        {isEditing ? 'Chỉnh sửa Khóa học' : 'Tạo Khóa học Mới'}
                    </h3>
                </div>
                {onCancel && (
                    <button onClick={onCancel} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition">
                        <X size={24} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm font-medium animate-pulse">
                        {error}
                    </div>
                )}

                {/* LAYOUT 2 CỘT: TRÁI (VIỆT) - PHẢI (NHẬT) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    
                    {/* --- CỘT 1: NỘI DUNG CHÍNH (TIẾNG VIỆT) --- */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b pb-2">
                            <span className="text-2xl">🇻🇳</span>
                            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Tiếng Việt <span className="text-red-500 text-xs normal-case">(Bắt buộc)</span></h4>
                        </div>

                        {/* 1. ẢNH BÌA */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Ảnh Bìa Khóa Học</label>
                            {!previewUrl ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 transition cursor-pointer relative">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <ImageIcon size={48} className="mb-2" />
                                    <span className="text-sm font-medium">Nhấn để tải ảnh lên</span>
                                </div>
                            ) : (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
                                    <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-4">
                                        <label className="cursor-pointer bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-sm transition">
                                            <Edit2 size={20} />
                                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                        </label>
                                        <button type="button" onClick={handleRemoveImage} className="bg-red-500/80 hover:bg-red-600 text-white p-3 rounded-full backdrop-blur-sm transition">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. TIÊU ĐỀ VI */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề (VI)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                                placeholder="VD: Lập trình ReactJS..."
                                disabled={loading}
                            />
                        </div>

                        {/* 3. MÔ TẢ VI (MARKDOWN) */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-bold text-gray-700">Mô tả (VI) - Markdown</label>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('write')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center transition ${activeTab === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Edit2 size={12} className="mr-1"/> Viết
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('preview')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center transition ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Eye size={12} className="mr-1"/> Xem
                                    </button>
                                </div>
                            </div>
                            
                            {activeTab === 'write' ? (
                                <textarea
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    rows={8}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition font-mono text-sm"
                                    placeholder="# Nội dung chính..."
                                    disabled={loading}
                                />
                            ) : (
                                <div className="w-full h-[200px] p-4 border border-gray-200 rounded-xl bg-gray-50 overflow-y-auto custom-scrollbar prose prose-sm prose-indigo max-w-none">
                                    {desc ? <ReactMarkdown>{desc}</ReactMarkdown> : <p className="text-gray-400 italic text-center mt-10">Chưa có nội dung.</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- CỘT 2: BẢN DỊCH (TIẾNG NHẬT) --- */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 border-b pb-2">
                            <span className="text-2xl">🇯🇵</span>
                            <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wider">Tiếng Nhật <span className="text-gray-400 text-xs normal-case">(Tùy chọn)</span></h4>
                        </div>

                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-6 h-full">
                            {/* 1. TIÊU ĐỀ JA */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề (JA)</label>
                                <input
                                    type="text"
                                    value={titleJa}
                                    onChange={(e) => setTitleJa(e.target.value)}
                                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition"
                                    placeholder="コースのタイトル..."
                                    disabled={loading}
                                />
                            </div>

                            {/* 2. MÔ TẢ JA */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả (JA)</label>
                                <textarea
                                    value={descJa}
                                    onChange={(e) => setDescJa(e.target.value)}
                                    rows={12} // Cao hơn một chút để cân bằng layout
                                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition resize-none"
                                    placeholder="コースの説明..."
                                    disabled={loading}
                                />
                                <p className="text-xs text-indigo-500 mt-2">
                                    * Nếu để trống, hệ thống sẽ hiển thị nội dung Tiếng Việt.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="mr-4 px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition">
                            Hủy
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all disabled:opacity-70 flex items-center"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin mr-2" /> : null}
                        {loading ? 'Đang xử lý...' : (isEditing ? 'Lưu Thay Đổi' : 'Tạo Khóa Học')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCourseForm;