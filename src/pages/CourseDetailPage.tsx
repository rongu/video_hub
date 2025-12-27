import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, List, Loader2, PlayCircle, CheckCircle2, Circle } from 'lucide-react';
import { 
    type Course, 
    type Video, 
    subscribeToCourseDetail, 
    subscribeToVideos,
    toggleVideoProgress,
    getFirebaseAuth 
} from '../services/firebase';
import { useUserProgress } from '../hooks/useUserProgress';

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface CourseDetailPageProps {
    courseId: string;
    onNavigate: (page: Page, courseId?: string | null) => void;
}

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ courseId, onNavigate }) => {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    
    const [course, setCourse] = useState<Course | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sử dụng Hook Progress
    const { completedVideoIds } = useUserProgress(currentUser?.uid, courseId);

    // Tính toán phần trăm hoàn thành
    const progressPercentage = useMemo(() => {
        if (!course || course.videoCount === 0) return 0;
        const percentage = (completedVideoIds.length / course.videoCount) * 100;
        return Math.min(Math.round(percentage), 100);
    }, [completedVideoIds, course]);

    useEffect(() => {
        if (!courseId) return;

        const unsubCourse = subscribeToCourseDetail(courseId, (fetchedCourse) => {
            setCourse(fetchedCourse);
            if (!fetchedCourse) setError("Khóa học không tồn tại.");
        });

        const unsubVideos = subscribeToVideos(courseId, null, (fetchedVideos) => {
            setVideos(fetchedVideos);
            if (!selectedVideo && fetchedVideos.length > 0) {
                setSelectedVideo(fetchedVideos[0]);
            }
            setLoading(false);
        });

        return () => {
            unsubCourse();
            unsubVideos();
        };
    }, [courseId]);

    const handleToggleComplete = async (videoId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Tránh việc nhấn nút toggle lại làm chọn video
        if (!currentUser) return;
        
        const isCompleted = completedVideoIds.includes(videoId);
        await toggleVideoProgress(currentUser.uid, courseId, videoId, !isCompleted);
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p className="text-lg font-medium">Đang tải nội dung...</p>
        </div>
    );

    if (error || !course) return (
        <div className="p-8"><button onClick={() => onNavigate('home')}>Quay lại</button><div>{error}</div></div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header với Progress Bar */}
            <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button onClick={() => onNavigate('home')} className="flex items-center text-indigo-600 font-medium">
                        <ChevronLeft size={20} className="mr-1"/> Khóa học của tôi
                    </button>

                    {/* Thanh tiến độ */}
                    <div className="flex-grow max-w-md flex items-center space-x-3">
                        <div className="flex-grow bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="bg-green-500 h-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                            {progressPercentage}% hoàn thành
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Video Player Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl shadow-indigo-100">
                        {selectedVideo ? (
                            <iframe
                                src={selectedVideo.videoUrl}
                                title={selectedVideo.title}
                                className="w-full h-full"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/50">Chọn video để xem</div>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedVideo?.title || course.title}</h2>
                        <p className="text-gray-600 leading-relaxed">{course.description}</p>
                    </div>
                </div>

                {/* Playlist Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-160px)]">
                        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <List size={18} className="mr-2 text-indigo-600"/> Nội dung khóa học
                            </h3>
                            <span className="text-xs font-medium text-gray-500">{completedVideoIds.length}/{videos.length} bài học</span>
                        </div>
                        
                        <div className="overflow-y-auto flex-grow p-2 space-y-1">
                            {videos.map((video) => {
                                const isDone = completedVideoIds.includes(video.id);
                                const isActive = selectedVideo?.id === video.id;
                                
                                return (
                                    <div 
                                        key={video.id}
                                        onClick={() => setSelectedVideo(video)}
                                        className={`group p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                                            isActive ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div onClick={(e) => handleToggleComplete(video.id, e)}>
                                                {isDone ? (
                                                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <Circle size={20} className="text-gray-300 group-hover:text-indigo-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <span className={`text-sm truncate ${isActive ? 'font-bold text-indigo-900' : 'text-gray-700'}`}>
                                                {video.title}
                                            </span>
                                        </div>
                                        <PlayCircle size={16} className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CourseDetailPage;