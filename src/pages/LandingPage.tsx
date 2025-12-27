import React, { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { PlayCircle, Loader2, ArrowRight, CheckCircle, MessageSquare, X, Phone, MessageCircle } from 'lucide-react';
import { 
    type Course, 
    subscribeToCourses, 
    subscribeToUserEnrollments 
} from '../services/firebase';

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail';

interface LandingPageProps {
    onNavigate: (page: Page, courseId?: string | null) => void;
    user: User | null;
    onLogout: () => Promise<void>;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, user, onLogout }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [userEnrollments, setUserEnrollments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showContactModal, setShowContactModal] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToCourses((fetched) => {
            setCourses(fetched);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setUserEnrollments([]);
            return;
        }
        const unsubscribe = subscribeToUserEnrollments(user.uid, (enrollments) => {
            setUserEnrollments(enrollments.map(e => e.courseId));
        });
        return () => unsubscribe();
    }, [user]);

    const handleEnrollClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            onNavigate('login');
            return;
        }
        setShowContactModal(true);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Navbar */}
            <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('landing')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg">
                            <PlayCircle className="text-white" size={24} />
                        </div>
                        <span className="text-xl font-black text-indigo-900 uppercase tracking-tighter">VideoHub</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <button onClick={() => onNavigate('home')} className="text-gray-600 font-bold text-sm hover:text-indigo-600 transition">Khóa học của tôi</button>
                                <button onClick={onLogout} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold">Đăng xuất</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onNavigate('login')} className="text-gray-600 font-bold text-sm">Đăng nhập</button>
                                <button onClick={() => onNavigate('register')} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg">Tham gia</button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <header className="py-16 px-6 text-center">
                <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase">Thư viện khóa học</h1>
                <p className="text-gray-500 mt-4 max-w-xl mx-auto font-medium">Khám phá lộ trình học tập chuyên nghiệp và liên hệ để bắt đầu ngay hôm nay.</p>
            </header>

            {/* Course Grid */}
            <section className="py-12 bg-gray-50 px-6 border-t border-gray-100 min-h-[60vh]">
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {courses.map((course) => {
                                const isEnrolled = userEnrollments.includes(course.id);
                                return (
                                    <div 
                                        key={course.id} 
                                        onClick={() => onNavigate('detail', course.id)}
                                        className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer flex flex-col"
                                    >
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            <img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={course.title} />
                                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 uppercase">
                                                {course.videoCount} Bài học
                                            </div>
                                        </div>
                                        <div className="p-8 flex-grow flex flex-col">
                                            <h3 className="text-xl font-black text-gray-900 mb-3 line-clamp-1 uppercase">{course.title}</h3>
                                            <p className="text-gray-500 text-sm line-clamp-2 mb-8 leading-relaxed flex-grow">{course.description}</p>
                                            
                                            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                                                {isEnrolled ? (
                                                    <span className="text-green-600 font-black text-xs uppercase flex items-center tracking-widest">
                                                        <CheckCircle size={16} className="mr-1.5" /> Đã tham gia
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={handleEnrollClick}
                                                        className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition"
                                                    >
                                                        <MessageSquare size={16} className="mr-1.5" /> Ghi danh ngay
                                                    </button>
                                                )}
                                                <span className="text-gray-400 font-black text-[10px] uppercase flex items-center">
                                                    Chi tiết <ArrowRight size={14} className="ml-1" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* MODAL LIÊN HỆ GHI DANH */}
            {showContactModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-indigo-600 p-8 text-white relative">
                            <button onClick={() => setShowContactModal(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition">
                                <X size={20} />
                            </button>
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Đăng ký tham gia</h3>
                            <p className="text-indigo-100 text-sm">Vui lòng liên hệ với Admin qua các kênh bên dưới để được kích hoạt khóa học nhanh nhất.</p>
                        </div>
                        <div className="p-8 space-y-4">
                            <a href="tel:0901234567" className="flex items-center p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 group">
                                <div className="bg-indigo-600 p-3 rounded-xl text-white mr-4 shadow-lg shadow-indigo-100">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hotline / Zalo</p>
                                    <p className="text-lg font-black text-gray-900">090 123 4567</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-300 group-hover:text-indigo-600 transition-transform" size={20} />
                            </a>

                            <a href="https://t.me/admin_id" target="_blank" className="flex items-center p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 group">
                                <div className="bg-blue-500 p-3 rounded-xl text-white mr-4 shadow-lg shadow-blue-100">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegram</p>
                                    <p className="text-lg font-black text-gray-900">@admin_videohub</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-300 group-hover:text-blue-500 transition-transform" size={20} />
                            </a>
                            
                            <button 
                                onClick={() => setShowContactModal(false)}
                                className="w-full py-4 mt-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all"
                            >
                                Đóng
                            </button>
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

export default LandingPage;