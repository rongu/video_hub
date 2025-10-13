import React, { useState } from 'react';
import { addCourse } from '../../services/firebase';
import { type User } from 'firebase/auth';

interface CreateCourseFormProps {
    user: User;
    onCourseCreated: () => void;
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ user, onCourseCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Kiểm tra đầu vào cơ bản
        if (!title || !description) {
            setError("Vui lòng nhập đầy đủ Tiêu đề và Mô tả.");
            setLoading(false);
            return;
        }

        try {
            // Gọi hàm tạo Khóa học từ firebase.ts
            await addCourse(title, description, user.uid);
            
            setSuccess(`Khóa học "${title}" đã được tạo thành công!`);
            setTitle('');
            setDescription('');
            onCourseCreated(); // Kích hoạt reload/update danh sách nếu cần
        } catch (err: any) {
            console.error("Lỗi khi tạo Khóa học:", err);
            setError("Tạo khóa học thất bại. Vui lòng kiểm tra console hoặc quy tắc Firestore.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-indigo-700">Tạo Khóa học Mới</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</p>}
                {success && <p className="p-2 bg-green-100 text-green-700 rounded text-sm">{success}</p>}

                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="title">Tiêu đề Khóa học</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="description">Mô tả Khóa học</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {loading ? 'Đang tạo...' : 'Tạo Khóa học'}
                </button>
            </form>
        </div>
    );
};

export default CreateCourseForm;