import React, { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { 
    BookOpen, 
    PlayCircle, 
    ChevronRight, 
    LogOut, 
    Compass,
    Loader2,
    ShieldCheck // Icon cho Admin
} from 'lucide-react';
import { 
    type Enrollment, 
    type Course, 
    subscribeToUserEnrollments, 
    subscribeToCourses,
    subscribeToAllUserProgress
} from '../services/firebase';

// Import Page Type cho khớp với App.tsx
import type { PageType } from '../App';

interface HomePageProps {
    user: User;
    onLogout: () => Promise<void>;
    onNavigate: (page: PageType, courseId?: string | null) => void;
    role: 'student' | 'admin';
}

const HomePage: React.FC<HomePageProps> = ({ user, onLogout, onNavigate, role }) => {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [progressMap, setProgressMap] = useState<{[courseId: string]: number}>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubEnroll = subscribeToUserEnrollments(user.uid, setEnrollments);
        const unsubCourses = subscribeToCourses(setCourses);
        const unsubProgress = subscribeToAllUserProgress(user.uid, (counts) => {
            setProgressMap(counts);
            setLoading(false);
        });

        return () => {
            unsubEnroll();
            unsubCourses();
            unsubProgress();
        };
    }, [user.uid]);

    const enrolledCourses = courses.filter(c => 
        enrollments.some(e => e.courseId === c.id)
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 w-full flex flex-col">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center space-x-2">
                    <div className="bg-indigo-600 p-1.5 rounded-lg">
                        <PlayCircle className="text-white" size={24} />
                    </div>
                    <span className="text-xl font-black text-indigo-900 uppercase tracking-tighter">VideoHub</span>
                </div>

                <div className="flex items-center space-x-4">
                    {/* --- NÚT DÀNH RIÊNG CHO ADMIN --- */}
                    {role === 'admin' && (
                        <button 
                            onClick={() => onNavigate('admin')}
                            className="flex items-center bg-gray-900 text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-black transition shadow-lg"
                        >
                            <ShieldCheck size={18} className="mr-2" /> Trang Quản Trị
                        </button>
                    )}

                    <button 
                        onClick={() => onNavigate('landing')}
                        className="hidden md:flex items-center text-indigo-600 font-bold text-sm hover:bg-indigo-50 px-4 py-2 rounded-xl transition"
                    >
                        <Compass size={18} className="mr-2" /> Khám phá
                    </button>
                    
                    <div className="flex items-center space-x-3 border-l pl-4 border-gray-100">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-black text-gray-900">{user.displayName || 'Học viên'}</p>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase">{role}</p>
                        </div>
                        <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto w-full p-6 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Khóa học của tôi</h1>
                        <p className="text-gray-500 font-medium">Bạn đã ghi danh {enrolledCourses.length} khóa học.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : enrolledCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {enrolledCourses.map(course => {
                            const completedCount = progressMap[course.id] || 0;
                            const progress = Math.round((completedCount / course.videoCount) * 100);

                            return (
                                <div 
                                    key={course.id}
                                    onClick={() => onNavigate('detail', course.id)}
                                    className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                                >
                                    <div className="aspect-video bg-gray-100 relative">
                                        <img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={course.title} />
                                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-indigo-600">
                                            {course.videoCount} VIDEO
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-4">
                                        <h3 className="text-xl font-black text-gray-900 uppercase line-clamp-1">{course.title}</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <span>Tiến độ</span>
                                                <span className="text-indigo-600">{progress}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex items-center justify-between border-t border-gray-50">
                                            <span className="text-xs font-black text-indigo-600 uppercase flex items-center group-hover:translate-x-1 transition-transform">
                                                Học tiếp <ChevronRight size={16} className="ml-1" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-[3rem] p-20 text-center space-y-6">
                        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                            <BookOpen className="text-indigo-300" size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Chưa có khóa học nào</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mt-2">Hãy khám phá thư viện để bắt đầu hành trình học tập của bạn.</p>
                        </div>
                        <button 
                            onClick={() => onNavigate('landing')}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-sm shadow-lg shadow-indigo-100"
                        >
                            Khám phá thư viện ngay
                        </button>
                    </div>
                )}
            </main>
            <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <p>© 2025 VideoHub. Học tập để vươn xa.</p>
            </footer>
        </div>
    );
};

export default HomePage;