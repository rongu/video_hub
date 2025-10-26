import React, { useEffect, useState, useCallback } from 'react';
import { type Video, subscribeToVideos, deleteVideo, updateVideo } from '../../services/firebase';
import { Loader2 } from 'lucide-react';
import VideoListItem from '../common/VideoListItem'; // Import component đã có nút Admin
import ConfirmDeleteModal from './ConfirmDeleteModal'; 

interface VideoListProps {
    courseId: string;
}

// Thành phần VideoList chính
const VideoList: React.FC<VideoListProps> = ({ courseId }) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State cho việc Xóa
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Lắng nghe Real-time danh sách Videos
    useEffect(() => {
        setLoading(true);
        setError(null);
        let unsubscribe = () => {};
        
        try {
            unsubscribe = subscribeToVideos(courseId, (fetchedVideos) => {
                // Sort mới nhất lên đầu, hoặc theo một trường nào đó nếu có
                setVideos(fetchedVideos.sort((a, b) => b.createdAt - a.createdAt)); 
                setLoading(false);
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Videos:", e);
            setError("Lỗi khi tải danh sách video.");
            setLoading(false);
        }

        return () => unsubscribe();
    }, [courseId]);

    // =================================================================
    // LOGIC CHỈNH SỬA (Được gọi từ VideoListItem -> onEditVideo)
    // =================================================================
    const handleEditVideo = useCallback(async (videoId: string, newTitle: string) => {
        try {
            // Chỉ cập nhật trường 'title'
            await updateVideo(courseId, videoId, { title: newTitle.trim() });
            // Firestore onSnapshot sẽ tự động cập nhật danh sách videos
        } catch (err) {
            console.error("Lỗi cập nhật video:", err);
            // Có thể hiển thị một thông báo lỗi tạm thời cho người dùng
            alert("Cập nhật tiêu đề thất bại. Vui lòng kiểm tra console."); 
        }
    }, []);


    // =================================================================
    // LOGIC XÓA (Được gọi từ VideoListItem -> onDeleteVideo)
    // =================================================================
    
    // 1. Bắt đầu quá trình xóa (mở modal)
    const handleDeleteClick = useCallback((videoId: string, videoTitle: string) => {
        // Tìm video đầy đủ thông tin để lưu trữ
        const video = videos.find(v => v.id === videoId);
        if (video) {
             setVideoToDelete(video);
        } else {
             // Trường hợp không tìm thấy, tạo đối tượng tạm thời
             setVideoToDelete({ id: videoId, title: videoTitle } as Video); 
        }
    }, [videos]); 

    // 2. Xác nhận xóa
    const handleConfirmDelete = async () => {
        if (!videoToDelete) return;

        setIsDeleting(true);
        setError(null);

        try {
            // HÀM QUAN TRỌNG: Xóa khỏi Firestore 
            // Cần đảm bảo hàm deleteVideo trong firebase.ts của bạn nhận đúng tham số. 
            // Giả định: deleteVideo(videoId)
            await deleteVideo(courseId, videoToDelete.id, videoToDelete.videoUrl);
            setVideoToDelete(null); // Đóng modal
        } catch (err: any) {
            console.error("Lỗi khi xóa Video:", err);
            setError(`Xóa video thất bại. Lỗi: ${err.message || "Kiểm tra quyền Firestore."}`);
        } finally {
            setIsDeleting(false);
        }
    };
    
    // Hàm giả định cho luồng người dùng thường (chưa thực hiện)
    const handleViewVideo = useCallback(() => {
        // Logic để mở video player
        console.log("Xem video đang được kích hoạt...");
    }, []);


    if (loading) {
        return (
            <div className="flex justify-center items-center p-8 bg-white rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
                <p className="text-gray-500">Đang tải danh sách video...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Danh sách Video ({videos.length})</h3>
            
            {error && <p className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200">{error}</p>}

            {videos.length === 0 ? (
                <p className="text-gray-500 italic p-4 border rounded-lg bg-gray-50">Khóa học này chưa có video nào.</p>
            ) : (
                <div className="bg-white border rounded-xl divide-y">
                    {videos.map((video, index) => (
                        <VideoListItem 
                            key={video.id} 
                            video={video}
                            index={index}
                            onViewVideo={handleViewVideo}
                            // TRUYỀN HÀM XỬ LÝ CHỈNH SỬA VÀ XÓA ĐÃ CÓ LOGIC FIREBASE
                            onEditVideo={handleEditVideo}
                            onDeleteVideo={handleDeleteClick} 
                        />
                    ))}
                </div>
            )}
            
            {/* Modal xác nhận xóa */}
            <ConfirmDeleteModal 
                isOpen={!!videoToDelete}
                onClose={() => setVideoToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Xác nhận xóa Video: "${videoToDelete?.title || ''}"`}
                description="Bạn có chắc chắn muốn xóa video này? Thao tác này không thể hoàn tác."
                isProcessing={isDeleting}
            />
        </div>
    );
};

export default VideoList;
