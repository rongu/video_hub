import React, { useState } from 'react';
import { type Course, updateCourse } from '../../services/firebase'; 
import { Loader2, X, Save } from 'lucide-react';

interface EditCourseFormProps {
    course: Course;
    onCourseUpdated: () => void;
    onClose: () => void;
}

const EditCourseForm: React.FC<EditCourseFormProps> = ({ course, onCourseUpdated, onClose }) => {
    const [title, setTitle] = useState(course.title);
    const [description, setDescription] = useState(course.description);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!title.trim() || !description.trim()) {
            setError("Tiêu đề và Mô tả không được để trống.");
            return;
        }

        setIsUpdating(true);

        try {
            await updateCourse(course.id, { title, description });
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
                <h3 className="text-2xl font-bold text-yellow-700">Chỉnh sửa Khóa học: {course.title}</h3>
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-title">Tiêu đề Khóa học <span className="text-red-500">*</span></label>
                    <input
                        id="edit-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Nhập tiêu đề khóa học..."
                        disabled={isUpdating}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="edit-description">Mô tả Khóa học <span className="text-red-500">*</span></label>
                    <textarea
                        id="edit-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                        placeholder="Mô tả ngắn gọn về khóa học..."
                        disabled={isUpdating}
                    />
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
