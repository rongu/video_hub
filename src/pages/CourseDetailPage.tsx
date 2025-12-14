import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, List, Loader2, PlayCircle, Video as VideoIcon } from 'lucide-react';
import { type Course, type Video, subscribeToCourseDetail, subscribeToVideos } from '../services/firebase';

// Định nghĩa Page type và Props cho CourseDetailPage
type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface CourseDetailPageProps {
    courseId: string;
    onNavigate: (page: Page, courseId?: string | null) => void;
}

// =================================================================
// SUB-COMPONENT: Video Player (Giữ nguyên)
// =================================================================

interface VideoPlayerProps {
    video: Video | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
    if (!video || !video.videoUrl) {
        return (
            <div className="bg-gray-800 rounded-xl flex items-center justify-center aspect-video text-white/70 shadow-inner">
                <PlayCircle size={48} className="mr-2"/> 
                {!video ? "Không có Video nào trong khóa học" : "Không có Video được chọn"}
            </div>
        );
    }
    
    return (
        <div className="relative w-full aspect-video bg-black rounded-xl shadow-2xl overflow-hidden">
            <iframe
                title={video.title}
                src={video.videoUrl} // Sử dụng videoUrl
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
            />
        </div>
    );
};

// =================================================================
// MAIN COMPONENT: CourseDetailPage
// =================================================================

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ courseId, onNavigate }) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Tải chi tiết Khóa học và Video
    useEffect(() => {
        if (!courseId) {
            setError("Lỗi: Không tìm thấy ID khóa học.");
            setLoading(false);
            return;
        }

        let unsubscribeCourse = () => {};
        let unsubscribeVideos = () => {};

        try {
            // A. Lắng nghe chi tiết Khóa học
            unsubscribeCourse = subscribeToCourseDetail(courseId, (fetchedCourse) => {
                if (!fetchedCourse) {
                    setError("Khóa học không tồn tại.");
                    setCourse(null);
                } else {
                    setCourse(fetchedCourse);
                    setError(null);
                }
            });

            // B. Lắng nghe danh sách Video
            // Truyền null cho sessionId (tham số thứ hai)
            unsubscribeVideos = subscribeToVideos(courseId, null, (fetchedVideos) => { 
                const sortedVideos = fetchedVideos;
                setVideos(sortedVideos);
                
                // Nếu chưa có video nào được chọn, chọn video đầu tiên
                if (!selectedVideo && sortedVideos.length > 0) {
                    setSelectedVideo(sortedVideos[0]);
                }
                setLoading(false);
            });

        } catch (e) {
            console.error("Lỗi khi tải dữ liệu trang chi tiết:", e);
            setError("Không thể kết nối đến dữ liệu khóa học.");
            setLoading(false);
        }

        return () => {
            unsubscribeCourse();
            unsubscribeVideos();
        };
    }, [courseId, selectedVideo]);

    // Xử lý khi người dùng chọn video khác
    const handleSelectVideo = useCallback((video: Video) => {
        setSelectedVideo(video);
    }, []);

    // Hiển thị trạng thái tải
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mr-3" />
                <p className="text-xl text-gray-700">Đang tải nội dung khóa học...</p>
            </div>
        );
    }
    
    // Hiển thị trạng thái lỗi
    if (error || !course) {
        return (
            <div className="min-h-screen p-8 bg-gray-100">
                {/* Nút quay lại sử dụng onNavigate('home') */}
                <button onClick={() => onNavigate('home')} className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4">
                    <ChevronLeft size={20} className="mr-2"/> Quay lại Trang chủ
                </button>
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md">
                    <p className="font-bold text-xl">Lỗi truy cập khóa học</p>
                    <p>{error || "Không thể tải thông tin khóa học."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-md p-4 sticky top-0 z-20 border-b border-gray-200">
                   <button 
                       onClick={() => onNavigate('home')} // ✅ SỬ DỤNG ONNAVIGATE MỚI
                       className="flex items-center text-indigo-600 font-medium hover:text-indigo-800 transition duration-150"
                     >
                        <ChevronLeft size={20} className="mr-2"/> Quay lại Khóa học của tôi
                     </button>
            </header>

            {/* Main Content: Video Player và Playlist */}
            <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{course.title}</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cột 1 & 2: Video Player và Mô tả */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* 1. Video Player */}
                        <VideoPlayer video={selectedVideo} />

                        {/* 2. Course/Video Description */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-2xl font-bold text-indigo-700 mb-3 border-b pb-2">
                                {selectedVideo ? selectedVideo.title : 'Tổng quan khóa học'}
                            </h2>
                            <p className="text-gray-600 mb-4">
                                {course.description}
                            </p>
                        </div>
                    </div>

                    {/* Cột 3: Playlist (Danh sách Video) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-20">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <List size={20} className="mr-2 text-indigo-600"/> Danh sách bài học ({videos.length})
                            </h2>
                            
                            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                                {videos.length === 0 ? (
                                    <p className="text-gray-500 italic">Khóa học này chưa có video nào.</p>
                                ) : (
                                    videos.map((video) => (
                                        <div 
                                            key={video.id}
                                            onClick={() => handleSelectVideo(video)}
                                            className={`p-3 rounded-lg flex items-center cursor-pointer transition duration-150 ${
                                                selectedVideo?.id === video.id 
                                                    ? 'bg-indigo-100 border-l-4 border-indigo-600 shadow-inner text-indigo-800 font-semibold'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            <PlayCircle size={18} className="mr-3 flex-shrink-0 text-indigo-600"/>
                                            <span className="text-sm line-clamp-2">
                                                {video.title}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500 mt-auto">
                &copy; {new Date().getFullYear()} Video Hub.
            </footer>
        </div>
    );
};

export default CourseDetailPage;