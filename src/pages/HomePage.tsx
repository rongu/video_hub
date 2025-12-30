import React, { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { useTranslation } from 'react-i18next'; // [i18n] Import hook
import { 
    BookOpen, 
    PlayCircle, 
    ChevronRight, 
    LogOut, 
    Compass,
    Loader2,
    ShieldCheck 
} from 'lucide-react';
import { 
    type Enrollment, 
    type Course, 
    subscribeToUserEnrollments, 
    subscribeToCourses,
    subscribeToAllUserProgress
} from '../services/firebase';
import LanguageSwitcher from '../components/common/LanguageSwitcher'; // [i18n] Import nút đổi ngôn ngữ

// Import Page Type cho khớp với App.tsx
import type { PageType } from '../App';

interface HomePageProps {
    user: User;
    onLogout: () => Promise<void>;
    onNavigate: (page: PageType, courseId?: string | null) => void;
    role: 'student' | 'admin';
}

const HomePage: React.FC<HomePageProps> = ({ user, onLogout, onNavigate, role }) => {
    const { t } = useTranslation(); // [i18n] Sử dụng hook
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
        // [FIX LAYOUT] Bỏ min-h-screen vì đã set ở #root, thêm w-full và flex-1
        <div className="bg-gray-50 font-sans text-gray-900 w-full flex-1 flex flex-col">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center space-x-2 shrink-0">
                    <div className="bg-indigo-600 p-1.5 rounded-lg">
                        <PlayCircle className="text-white" size={24} />
                    </div>
                    {/* Ẩn tên app trên mobile cực nhỏ để tránh vỡ layout */}
                    <span className="text-xl font-black text-indigo-900 uppercase tracking-tighter hidden xs:block">VideoHub</span>
                </div>

                <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
                    {/* [i18n] Nút đổi ngôn ngữ */}
                    <LanguageSwitcher />

                    {/* --- NÚT DÀNH RIÊNG CHO ADMIN --- */}
                    {role === 'admin' && (
                        <button 
                            onClick={() => onNavigate('admin')}
                            className="flex items-center bg-gray-900 text-white font-bold text-xs md:text-sm px-3 md:px-4 py-2 rounded-xl hover:bg-black transition shadow-lg whitespace-nowrap"
                        >
                            <ShieldCheck size={16} className="mr-1 md:mr-2" /> 
                            <span className="hidden sm:inline">{t('nav.admin')}</span>
                            <span className="sm:hidden">Admin</span>
                        </button>
                    )}

                    <button 
                        onClick={() => onNavigate('landing')}
                        className="hidden md:flex items-center text-indigo-600 font-bold text-sm hover:bg-indigo-50 px-4 py-2 rounded-xl transition whitespace-nowrap"
                    >
                        <Compass size={18} className="mr-2" /> {t('nav.explore')}
                    </button>
                    
                    <div className="flex items-center space-x-3 border-l pl-4 border-gray-100 ml-2">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-black text-gray-900 truncate max-w-[100px] md:max-w-none">{user.displayName || 'Học viên'}</p>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase">{role}</p>
                        </div>
                        <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition" title={t('nav.logout')}>
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-10 flex-grow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">
                            {t('home.welcome_title')}
                        </h1>
                        <p className="text-gray-500 font-medium text-sm md:text-base">
                            {t('home.enrolled_msg', { count: enrolledCourses.length })}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : enrolledCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {enrolledCourses.map(course => {
                            const completedCount = progressMap[course.id] || 0;
                            const videoCount = course.videoCount || 1; // Tránh chia cho 0
                            const progress = Math.round((completedCount / videoCount) * 100);

                            return (
                                <div 
                                    key={course.id}
                                    onClick={() => onNavigate('detail', course.id)}
                                    className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full"
                                >
                                    <div className="aspect-video bg-gray-100 relative shrink-0">
                                        <img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={course.title} />
                                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-indigo-600">
                                            {course.videoCount} VIDEO
                                        </div>
                                    </div>
                                    <div className="p-6 md:p-8 space-y-4 flex flex-col flex-1">
                                        <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase line-clamp-1" title={course.title}>{course.title}</h3>
                                        <div className="space-y-2 flex-1">
                                            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <span>{t('home.progress')}</span>
                                                <span className="text-indigo-600">{progress}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex items-center justify-between border-t border-gray-50 mt-auto">
                                            <span className="text-xs font-black text-indigo-600 uppercase flex items-center group-hover:translate-x-1 transition-transform">
                                                {t('home.continue')} <ChevronRight size={16} className="ml-1" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-[3rem] p-10 md:p-20 text-center space-y-6">
                        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                            <BookOpen className="text-indigo-300" size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{t('home.no_course')}</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mt-2 text-sm">Hãy khám phá thư viện để bắt đầu hành trình học tập của bạn.</p>
                        </div>
                        <button 
                            onClick={() => onNavigate('landing')}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                        >
                            {t('home.explore_btn')}
                        </button>
                    </div>
                )}
            </main>
            <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <p>© 2025 {t('footer.slogan')}</p>
            </footer>
        </div>
    );
};

export default HomePage;