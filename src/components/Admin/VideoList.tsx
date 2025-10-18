import React, { useEffect, useState } from 'react';
import { type Video, subscribeToVideos } from '../../services/firebase';

interface VideoListProps {
    courseId: string;
}

// Hàm chuyển đổi thời lượng (giây) thành định dạng phút:giây
const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
};

const VideoList: React.FC<VideoListProps> = ({ courseId }) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Lắng nghe real-time danh sách Video
    useEffect(() => {
        setLoading(true);
        setError(null);

        // Đảm bảo có courseId để lắng nghe
        if (!courseId) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToVideos(courseId, (fetchedVideos) => {
            setVideos(fetchedVideos);
            setLoading(false);
        });

        // Cleanup: Dừng lắng nghe khi component bị hủy hoặc courseId thay đổi
        return () => unsubscribe();
    }, [courseId]);

    if (loading) {
        return <p className="text-center p-4 text-gray-500">Đang tải danh sách video...</p>;
    }

    if (error) {
        return <p className="text-center p-4 text-red-500">Lỗi tải video: {error}</p>;
    }

    return (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Danh sách Bài học ({videos.length})</h4>
            
            {videos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Chưa có video nào trong khóa học này.</p>
            ) : (
                <ul className="space-y-3">
                    {videos.map((video) => (
                        <li 
                            key={video.id} 
                            className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm hover:shadow-md transition duration-150"
                        >
                            <div className="flex items-center space-x-3">
                                <span className="text-lg font-bold text-purple-600 w-6 text-center">{video.order}</span>
                                <div className="flex flex-col">
                                    <span className="text-base font-medium text-gray-800">{video.title}</span>
                                    <a 
                                        href={video.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-xs text-blue-500 hover:underline truncate w-64 md:w-auto"
                                    >
                                        {video.url}
                                    </a>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                <span className="text-sm font-semibold text-green-600">
                                    {formatDuration(video.duration)}
                                </span>
                                {/* Nút chỉnh sửa/xóa sẽ được thêm ở Level sau */}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default VideoList;
