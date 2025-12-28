import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ChevronLeft, List, Loader2, CheckCircle2, Circle, Lock, X, Phone, MessageCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { 
    type Course, 
    type Video, 
    subscribeToCourseDetail, 
    subscribeToVideos,
    subscribeToUserEnrollments, // Thêm import này
    getFirebaseAuth ,
    toggleVideoProgress
} from '../services/firebase';
import { useUserProgress } from '../hooks/useUserProgress';

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface CourseDetailPageProps {
    courseId: string;
    onNavigate: (page: Page, courseId?: string | null) => void;
}

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ courseId, onNavigate }) => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    const [course, setCourse] = useState<Course | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [showContactModal, setShowContactModal] = useState(false);
    
    // Quản lý danh sách khóa học đã ghi danh riêng biệt
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);

    // Cờ để đảm bảo tính năng "Học tiếp" chỉ chạy một lần duy nhất khi vừa load trang
    const hasAutoResumed = useRef(false);

    const { completedVideoIds} = useUserProgress(user?.uid, courseId);
    
    // Lắng nghe trạng thái ghi danh của User
    useEffect(() => {
        if (!user?.uid) {
            setEnrolledCourseIds([]);
            return;
        }
        
        // Sử dụng service có sẵn để lấy danh sách ID các khóa đã ghi danh
        const unsub = subscribeToUserEnrollments(user.uid, (enrollments) => {
            setEnrolledCourseIds(enrollments.map(e => e.courseId));
        });
        
        return () => unsub();
    }, [user?.uid]);

    // Kiểm tra xem user hiện tại đã ghi danh khóa học này chưa
    const isEnrolled = useMemo(() => {
        if (!user) return false;
        return enrolledCourseIds.includes(courseId);
    }, [user, enrolledCourseIds, courseId]);

    const progressPercentage = useMemo(() => {
        if (!course || course.videoCount === 0) return 0;
        return Math.min(Math.round((completedVideoIds.length / course.videoCount) * 100), 100);
    }, [completedVideoIds, course]);

    const handleToggleComplete = async (videoId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Tránh việc nhấn nút toggle lại làm chọn video
        if (!user) return;
        
        const isCompleted = completedVideoIds.includes(videoId);
        await toggleVideoProgress(user.uid, courseId, videoId, !isCompleted);
    };

    // Lấy dữ liệu Course và Videos
    useEffect(() => {
        if (!courseId) return;
        const unsubCourse = subscribeToCourseDetail(courseId, setCourse);
        const unsubVideos = subscribeToVideos(courseId, null, (fetched) => {
            setVideos(fetched);
            setLoading(false);
        });
        return () => { unsubCourse(); unsubVideos(); };
    }, [courseId, selectedVideo]);

    // ==========================================================
    // LOGIC: HỌC TIẾP (RESUME LEARNING)
    // ==========================================================
    useEffect(() => {
        // Chỉ chạy khi đã tải xong Videos, Tiến độ học tập và chưa từng Resume trước đó trong session này
        if (!loading && videos.length > 0 && !hasAutoResumed.current) {
            
            if (isEnrolled) {
                // Tìm video đầu tiên chưa hoàn thành (videos đã được sắp xếp theo orderIndex từ database)
                const nextVideo = videos.find(v => !completedVideoIds.includes(v.id));
                
                if (nextVideo) {
                    setSelectedVideo(nextVideo);
                } else {
                    // Nếu đã hoàn thành hết, mặc định chọn video cuối cùng hoặc video đầu tiên
                    setSelectedVideo(videos[0]);
                }
            } else {
                // Nếu chưa ghi danh, mặc định hiển thị video đầu tiên (nhưng sẽ bị khóa)
                setSelectedVideo(videos[0]);
            }
            
            hasAutoResumed.current = true;
        }
    }, [loading, videos, completedVideoIds, isEnrolled]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button 
                        onClick={() => onNavigate(user && isEnrolled ? 'home' : 'landing')} 
                        className="flex items-center text-gray-500 font-bold hover:text-indigo-600 transition text-sm uppercase tracking-tighter"
                    >
                        <ChevronLeft size={18} className="mr-1"/> Quay lại
                    </button>

                    {isEnrolled && (
                        <div className="flex items-center space-x-3 bg-indigo-50 p-2 px-4 rounded-full border border-indigo-100">
                            <div className="bg-gray-200 rounded-full h-1.5 w-24 overflow-hidden">
                                <div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${progressPercentage}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-indigo-700 uppercase">{progressPercentage}% hoàn thành</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    {/* VIDEO PLAYER AREA */}
                    <div className="aspect-video bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-gray-100">
                        {!isEnrolled ? (
                            <div className="w-full h-full relative">
                                <img src={course?.imageUrl} className="w-full h-full object-cover opacity-20 blur-sm" alt="guest-view" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-6">
                                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20">
                                        <Lock size={40} className="text-white" />
                                    </div>
                                    <div className="max-w-sm">
                                        <h3 className="text-white text-2xl font-black mb-2 uppercase tracking-tight">Bài học đã bị khóa</h3>
                                        <p className="text-gray-300 text-sm mb-8 font-medium">Khóa học này chưa được ghi danh. Vui lòng liên hệ Admin để kích hoạt tài khoản của bạn.</p>
                                        <button 
                                            onClick={() => user ? setShowContactModal(true) : onNavigate('login')}
                                            className="bg-indigo-600 text-white w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
                                        >
                                            {user ? 'Liên hệ Admin để ghi danh' : 'Đăng nhập để đăng ký'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : selectedVideo ? (
                            <iframe 
                                src={selectedVideo.videoUrl} 
                                title={selectedVideo.title} 
                                className="w-full h-full" 
                                allowFullScreen 
                                key={selectedVideo.id} // Re-mount iframe khi đổi video
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-8 text-center">
                                <PlayCircle size={48} className="mb-4 opacity-20" />
                                <p className="font-bold uppercase text-xs tracking-widest">Đang tải video bài học...</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-1.5 bg-indigo-600 rounded-full"></div>
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight">
                                {selectedVideo?.title || course?.title}
                            </h2>
                        </div>
                        <div className="flex items-center space-x-4">
                             {selectedVideo && completedVideoIds.includes(selectedVideo.id) && (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center">
                                    <CheckCircle2 size={12} className="mr-1" /> Đã hoàn thành
                                </span>
                             )}
                             <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                Bài {videos.findIndex(v => v.id === selectedVideo?.id) + 1} / {videos.length}
                             </span>
                        </div>
                        <p className="text-gray-500 leading-relaxed text-lg font-medium pt-2">{course?.description}</p>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden flex flex-col shadow-sm max-h-[calc(100vh-160px)]">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-widest flex items-center">
                                <List size={16} className="mr-2 text-indigo-600"/> Lộ trình học tập
                            </h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase">{videos.length} Bài</span>
                        </div>
                        
                        <div className="overflow-y-auto flex-grow p-4 space-y-2 custom-scrollbar">
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

            {/* MODAL LIÊN HỆ GHI DANH */}
            {showContactModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="bg-indigo-600 p-8 text-white relative">
                            <button onClick={() => setShowContactModal(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Đăng ký học tập</h3>
                            <p className="text-indigo-100 text-sm italic leading-relaxed">Vui lòng liên hệ Admin để kích hoạt quyền truy cập vào các bài giảng của khóa học này.</p>
                        </div>
                        <div className="p-8 space-y-4">
                            <a href="tel:0901234567" className="flex items-center p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 group">
                                <div className="bg-indigo-600 p-3 rounded-xl text-white mr-4"><Phone size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hotline / Zalo</p>
                                    <p className="text-lg font-black text-gray-900">090 123 4567</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-300 group-hover:text-indigo-600 transition-transform" size={20} />
                            </a>
                            <a href="https://t.me/admin_id" target="_blank" className="flex items-center p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 group">
                                <div className="bg-blue-500 p-3 rounded-xl text-white mr-4"><MessageCircle size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegram</p>
                                    <p className="text-lg font-black text-gray-900">@admin_videohub</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-300 group-hover:text-blue-500 transition-transform" size={20} />
                            </a>
                            <button onClick={() => setShowContactModal(false)} className="w-full py-4 mt-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
            <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <p>© 2025 VideoHub. Học tập để vươn xa.</p>
            </footer>
        </div>
    );
};

export default CourseDetailPage;