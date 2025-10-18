import React, { useState } from 'react';
import { addVideo,type  Video } from '../../services/firebase';
import { type User } from 'firebase/auth';

interface CreateVideoFormProps {
    courseId: string;
    courseTitle: string;
    adminUser: User;
    onVideoCreated: () => void;
    onClose: () => void;
}

const CreateVideoForm: React.FC<CreateVideoFormProps> = ({ courseId, courseTitle, adminUser, onVideoCreated, onClose }) => {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [duration, setDuration] = useState(0); // Tính bằng giây
    const [order, setOrder] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!title || !url || duration <= 0 || order <= 0) {
            setError("Vui lòng nhập đầy đủ và chính xác các trường (Thời lượng và Thứ tự phải lớn hơn 0).");
            return;
        }
        
        setLoading(true);

        try {
            const videoData: Omit<Video, 'id'> = {
                title,
                url,
                duration,
                order,
            };

            await addVideo(courseId, videoData, adminUser.uid);
            
            setSuccess(`Video "${title}" đã được thêm thành công vào khóa học "${courseTitle}"!`);
            setTitle('');
            setUrl('');
            setDuration(0);
            setOrder(1);

            onVideoCreated(); // Cập nhật lại danh sách video/khóa học
            setTimeout(onClose, 2000); // Tự động đóng form sau 2 giây
        } catch (err: any) {
            console.error("Lỗi khi tạo Video:", err);
            setError("Tạo video thất bại. Vui lòng kiểm tra console hoặc quy tắc Firestore.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-xl border-t-4 border-purple-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-purple-700">Thêm Video mới vào: "{courseTitle}"</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">
                    &times;
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</p>}
                {success && <p className="p-2 bg-green-100 text-green-700 rounded text-sm">{success}</p>}

                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="title">Tiêu đề Video</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700" htmlFor="url">URL Video (YouTube Embed/Direct)</label>
                    <input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="duration">Thời lượng (Giây)</label>
                        <input
                            id="duration"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                            min="1"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="order">Thứ tự</label>
                        <input
                            id="order"
                            type="number"
                            value={order}
                            onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                            min="1"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                    {loading ? 'Đang lưu Video...' : 'Lưu Video'}
                </button>
            </form>
        </div>
    );
};

export default CreateVideoForm;
