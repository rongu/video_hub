import React, { useState, useCallback, useRef, useEffect } from 'react';
// ✅ BỔ SUNG Bookmark icon
import { PlayCircle, Edit2, Trash2, Save, X, Bookmark } from 'lucide-react';
// Giữ lại imports mặc dù không gọi trực tiếp để TypeScript biết kiểu dữ liệu
import { type Video, updateVideo, deleteVideo } from '../../services/firebase'; 

interface VideoListItemProps {
    video: Video; // Video đã có sessionId
    index: number;
    // Chức năng: Gọi hàm cập nhật/xóa được truyền từ VideoList
    onEditVideo: (videoId: string, newTitle: string) => void;
    
    // ✅ THAY ĐỔI LỚN: Bây giờ onDeleteVideo nhận toàn bộ object Video
    onDeleteVideo: (video: Video) => void; 
    
    // onViewVideo được giữ lại cho luồng người dùng thường (xem video)
    onViewVideo: (video: Video) => void; 
    // ✅ BỔ SUNG: Dùng cho CSS lồng nhau (đã thêm trong VideoList.tsx)
    className?: string; 
}

const VideoListItem: React.FC<VideoListItemProps> = ({ video, index, onViewVideo, onEditVideo, onDeleteVideo, className = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newTitle, setNewTitle] = useState(video.title);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // =================================================================
    // EFFECT & Handlers CƠ BẢN (Giữ nguyên)
    // =================================================================
    
    // Đảm bảo tiêu đề được đồng bộ hóa
    useEffect(() => {
        setNewTitle(video.title);
    }, [video.title]);

    // Bắt đầu chế độ chỉnh sửa
    const startEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    // Hủy bỏ chỉnh sửa
    const cancelEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setNewTitle(video.title); // Quay lại tiêu đề cũ
        setIsEditing(false);
    }, [video.title]);
    
    // Khi ở chế độ xem, click vào item sẽ kích hoạt onViewVideo
    const handleViewClick = useCallback(() => {
        if (!isEditing) {
            onViewVideo(video);
        }
    }, [isEditing, onViewVideo, video]);

    // =================================================================
    // Handlers GỌI PROP (Đã cập nhật onDeleteVideo)
    // =================================================================
    
    // Xử lý lưu tiêu đề (Kích hoạt prop onEditVideo)
    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); 
        
        if (newTitle === video.title || newTitle.trim() === '') {
            setIsEditing(false);
            return;
        }

        setLoading(true);
        try {
            // Gọi prop onEditVideo để VideoList (cha) xử lý logic Firebase
            await onEditVideo(video.id, newTitle); 
            setIsEditing(false);
        } catch (error) {
            // Lỗi sẽ được bắt và xử lý ở VideoList
            console.error("Lỗi khi cập nhật tiêu đề video:", error);
        } finally {
            setLoading(false);
        }
    }, [video.id, video.title, newTitle, onEditVideo]);

    // Xử lý xóa (Kích hoạt prop onDeleteVideo)
    const handleDeleteClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        // ✅ THAY ĐỔI: Thay vì truyền ID và Title, truyền toàn bộ object Video
        onDeleteVideo(video); 
    }, [video, onDeleteVideo]); // Dependency là [video, onDeleteVideo]


    // =================================================================
    // RENDER LOGIC
    // =================================================================
    
    if (isEditing) {
        return (
            <div className={`flex items-center p-4 bg-indigo-50 border-2 border-indigo-400 rounded-xl shadow-lg transition duration-300 ${className}`}>
                <div className="flex-shrink-0 w-8 text-lg font-bold text-indigo-600 mr-4 text-center">
                    #{index + 1}
                </div>
                
                <form onSubmit={handleSave} className="flex-grow flex items-center space-x-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-grow p-2 border border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-gray-100"
                        disabled={loading}
                    />
                    
                    <button
                        type="submit"
                        disabled={loading}
                        title="Lưu"
                        className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition disabled:opacity-50"
                    >
                        <Save size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={loading}
                        title="Hủy"
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </form>
            </div>
        );
    }

    // Chế độ xem mặc định
    return (
        <div 
            onClick={handleViewClick}
            // ✅ BỔ SUNG className vào div chính
            className={`flex items-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition duration-300 cursor-pointer border border-gray-100 hover:border-indigo-400 ${className}`}
        >
            <div className="flex-shrink-0 w-8 text-lg font-bold text-indigo-600 mr-4 text-center">
                #{index + 1}
            </div>
            <div className="flex-grow">
                <p className="text-gray-800 font-semibold truncate hover:text-indigo-600">{video.title}</p>
                
                {/* Hiển thị Session mà video này thuộc về */}
                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                    <Bookmark size={14} className="text-indigo-400"/>
                    <span className="font-medium">
                        **Session ID:** {video.sessionId}
                    </span>
                </div>
            </div>

            {/* Vùng nút Admin (Edit/Delete) */}
            <div className="flex space-x-2 ml-4 flex-shrink-0">
                <button
                    onClick={startEdit}
                    title="Chỉnh sửa Tiêu đề"
                    className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-full transition"
                >
                    <Edit2 size={18} />
                </button>
                <button
                    onClick={handleDeleteClick}
                    title="Xóa Video"
                    className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"
                >
                    <Trash2 size={18} />
                </button>
            </div>
            
            <PlayCircle className="flex-shrink-0 h-8 w-8 text-green-500 ml-4 hover:text-green-600 transition" />
        </div>
    );
};

export default VideoListItem;