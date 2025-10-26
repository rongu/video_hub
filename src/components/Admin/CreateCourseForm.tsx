import React, { useState, useEffect, useCallback } from 'react';
import { type User } from 'firebase/auth';
// ĐÃ SỬA LỖI ĐƯỜNG DẪN: Từ ../../services/firebase thành ../services/firebase
import { type Course, addCourse, updateCourse } from '../../services/firebase';
import { Loader2 } from 'lucide-react';

interface CreateCourseFormProps {
    user: User;
    initialCourse: Course | null; // Prop để truyền dữ liệu chỉnh sửa
    onCourseSaved: () => void; // Callback khi lưu thành công
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ user, initialCourse, onCourseSaved }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isEditing = !!initialCourse;

    // Thiết lập state khi component mount hoặc khi initialCourse thay đổi (chuyển từ Tạo -> Sửa hoặc ngược lại)
    useEffect(() => {
        if (initialCourse) {
            setTitle(initialCourse.title);
            setDescription(initialCourse.description);
        } else {
            setTitle('');
            setDescription('');
        }
    }, [initialCourse]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!title || !description) {
            setError("Vui lòng điền đầy đủ Tiêu đề và Mô tả.");
            return;
        }

        setLoading(true);
        const courseData: Partial<Course> = {
            title,
            description,
            adminId: user.uid,
        };

        try {
            if (isEditing && initialCourse?.id) {
                // CẬP NHẬT KHÓA HỌC HIỆN TẠI
                await updateCourse(initialCourse.id, courseData);
                console.log(`Khóa học ${initialCourse.id} đã được cập nhật.`);
            } else {
                // TẠO MỚI KHÓA HỌC
                await addCourse(courseData); 
                console.log('Khóa học mới đã được tạo.');
            }
            onCourseSaved();
        } catch (err) {
            console.error(isEditing ? "Lỗi cập nhật khóa học:" : "Lỗi tạo khóa học:", err);
            setError(isEditing ? "Cập nhật khóa học thất bại. Vui lòng thử lại." : "Tạo khóa học thất bại. Vui lòng kiểm tra console.");
        } finally {
            setLoading(false);
        }
    }, [title, description, isEditing, initialCourse, user, onCourseSaved]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4 border-b pb-2">
                {isEditing ? `Chỉnh sửa: ${initialCourse?.title}` : 'Thông tin Khóa học'}
            </h3>
            
            {/* Input Tiêu đề */}
            <div>
                <label htmlFor="courseTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề Khóa học
                </label>
                <input
                    id="courseTitle"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="Ví dụ: Lập trình React cơ bản"
                    disabled={loading}
                />
            </div>

            {/* Input Mô tả */}
            <div>
                <label htmlFor="courseDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả Khóa học
                </label>
                <textarea
                    id="courseDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
                    placeholder="Mô tả chi tiết nội dung khóa học và đối tượng mục tiêu."
                    disabled={loading}
                />
            </div>
            
            {/* Hiển thị lỗi */}
            {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm" role="alert">
                    {error}
                </div>
            )}

            {/* Nút Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {loading ? (
                    <><Loader2 size={20} className="animate-spin mr-2" /> Đang xử lý...</>
                ) : (
                    isEditing ? 'Lưu thay đổi Khóa học' : 'Tạo Khóa học'
                )}
            </button>
        </form>
    );
};

export default CreateCourseForm;
