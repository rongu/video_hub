import React, { useState, useEffect, useCallback } from 'react';
import { type User } from 'firebase/auth';
// Đảm bảo bạn đã export uploadCourseImage từ courses.ts
import { type Course, addCourse, updateCourse, uploadCourseImage } from '../../services/firebase';
import { Loader2, Image as ImageIcon, X, Eye, Edit2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CreateCourseFormProps {
    user: User;
    initialCourse: Course | null; 
    onCourseSaved: () => void; 
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ user, initialCourse, onCourseSaved }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    // State cho Image Upload
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // State cho Markdown Preview
    const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isEditing = !!initialCourse;

    useEffect(() => {
        if (initialCourse) {
            setTitle(initialCourse.title);
            setDescription(initialCourse.description);
            setPreviewUrl(initialCourse.imageUrl || null);
            setImageFile(null); // Reset file mới khi load course cũ
        } else {
            setTitle('');
            setDescription('');
            setPreviewUrl(null);
            setImageFile(null);
        }
    }, [initialCourse]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // Tạo URL tạm để preview
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setPreviewUrl(null);
        // Lưu ý: Nếu đang edit, việc này sẽ xóa ảnh hiển thị nhưng chưa xóa trên server
        // Logic nâng cao có thể cần cờ 'isImageDeleted' nếu muốn cho phép xóa hẳn ảnh về default.
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!title || !description) {
            setError("Vui lòng điền đầy đủ Tiêu đề và Mô tả.");
            return;
        }

        setLoading(true);
        
        try {
            let imageUrl = initialCourse?.imageUrl;

            // Nếu có chọn file ảnh mới, thực hiện upload
            if (imageFile) {
                imageUrl = await uploadCourseImage(imageFile);
            }

            const courseData: Partial<Course> = {
                title,
                description,
                adminId: user.uid,
                imageUrl: imageUrl, // Cập nhật URL ảnh mới (hoặc giữ cũ)
            };

            if (isEditing && initialCourse?.id) {
                await updateCourse(initialCourse.id, courseData);
                console.log(`Khóa học ${initialCourse.id} đã được cập nhật.`);
            } else {
                await addCourse(courseData); 
                console.log('Khóa học mới đã được tạo.');
            }
            onCourseSaved();
        } catch (err) {
            console.error("Lỗi lưu khóa học:", err);
            setError("Có lỗi xảy ra khi lưu khóa học. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [title, description, imageFile, isEditing, initialCourse, user, onCourseSaved]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-3 mb-6">
                {isEditing ? `Chỉnh sửa: ${initialCourse?.title}` : 'Tạo Khóa học Mới'}
            </h3>
            
            {/* --- 1. ẢNH BÌA KHÓA HỌC --- */}
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
                        
                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-4">
                            <label className="cursor-pointer bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-sm transition">
                                <Edit2 size={20} />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </label>
                            <button 
                                type="button"
                                onClick={handleRemoveImage}
                                className="bg-red-500/80 hover:bg-red-600 text-white p-3 rounded-full backdrop-blur-sm transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- 2. TIÊU ĐỀ --- */}
            <div>
                <label htmlFor="courseTitle" className="block text-sm font-bold text-gray-700 mb-1">
                    Tiêu đề Khóa học <span className="text-red-500">*</span>
                </label>
                <input
                    id="courseTitle"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="Ví dụ: Lập trình ReactJS từ A-Z"
                    disabled={loading}
                />
            </div>

            {/* --- 3. MÔ TẢ (MARKDOWN) --- */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-gray-700">
                        Mô tả chi tiết (Hỗ trợ Markdown) <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Tabs Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setActiveTab('write')}
                            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center transition ${
                                activeTab === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Edit2 size={12} className="mr-1"/> Viết
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center transition ${
                                activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Eye size={12} className="mr-1"/> Xem trước
                        </button>
                    </div>
                </div>

                {activeTab === 'write' ? (
                    <textarea
                        id="courseDescription"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={10}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-mono text-sm leading-relaxed"
                        placeholder="# Giới thiệu khóa học&#10;&#10;Nội dung bao gồm...&#10;- Bài 1: ...&#10;- Bài 2: ..."
                        disabled={loading}
                    />
                ) : (
                    <div className="w-full h-[260px] p-4 border border-gray-200 rounded-lg bg-gray-50 overflow-y-auto custom-scrollbar prose prose-sm prose-indigo max-w-none">
                        {description ? (
                            <ReactMarkdown>{description}</ReactMarkdown>
                        ) : (
                            <p className="text-gray-400 italic text-center mt-20">Chưa có nội dung để hiển thị.</p>
                        )}
                    </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Gợi ý: Sử dụng **đậm**, *nghiêng*, - danh sách, và # tiêu đề.</p>
            </div>
            
            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm font-medium">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {loading ? (
                    <><Loader2 size={20} className="animate-spin mr-2" /> Đang lưu...</>
                ) : (
                    isEditing ? 'Lưu thay đổi' : 'Tạo Khóa học'
                )}
            </button>
        </form>
    );
};

export default CreateCourseForm;