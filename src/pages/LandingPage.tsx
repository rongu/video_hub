import React, { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { useTranslation } from 'react-i18next'; // [i18n] Import hook
import { PlayCircle, Loader2, ArrowRight, CheckCircle, MessageSquare, X, Phone, MessageCircle, Tag } from 'lucide-react';
import { 
    type Course, 
    subscribeToCourses, 
    subscribeToUserEnrollments ,
    tr_h
} from '../services/firebase';
import { subscribeToCategories, type Category, getCategoryColorConfig } from '../services/firebase/categories';
import LanguageSwitcher from '../components/common/LanguageSwitcher'; // [i18n] Import nút đổi ngôn ngữ

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail';

interface LandingPageProps {
    onNavigate: (page: Page, courseId?: string | null) => void;
    user: User | null;
    onLogout: () => Promise<void>;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, user, onLogout }) => {
    const { t } = useTranslation(); // [i18n] Sử dụng hook translation
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [userEnrollments, setUserEnrollments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showContactModal, setShowContactModal] = useState(false);
    const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToCourses((fetched) => {
            setCourses(fetched);
            setLoading(false);
        });
        const unsubCats = subscribeToCategories(setCategories);
        return () => {
            unsubscribe();
            unsubCats();
        };
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
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-700">
            {/* Navbar */}
            <nav className="border-b border-gray-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('landing')}>
                        <div className="argon-icon-badge primary" style={{width:'2.25rem',height:'2.25rem'}}>
                            <PlayCircle className="text-white" size={20} />
                        </div>
                        <span className="text-xl font-bold text-gray-700 tracking-tight">VideoHub</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* [i18n] Thêm nút đổi ngôn ngữ */}
                        <LanguageSwitcher />

                        {user ? (
                            <>
                                <button onClick={() => onNavigate('home')} className="text-gray-600 font-semibold text-sm hover:text-[#1A73E8] transition">
                                    {t('nav.my_courses')}
                                </button>
                                <button onClick={onLogout} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">
                                    {t('nav.logout')}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onNavigate('login')} className="text-gray-600 font-semibold text-sm hover:text-[#1A73E8] transition">
                                    {t('nav.login')}
                                </button>
                                <button onClick={() => onNavigate('register')} className="argon-button-gradient text-sm">
                                    {t('nav.register')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <header className="py-16 px-6 text-center bg-white">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-700 tracking-tight">
                    {t('landing.hero_title')}
                </h1>
                <p className="text-gray-600 mt-4 max-w-xl mx-auto font-normal text-lg">
                    {t('landing.hero_subtitle')}
                </p>
            </header>

            {/* Course Grid */}
            <section className="py-12 bg-[#F8F9FA] px-6 border-t border-gray-200 min-h-[60vh]">
                <div className="max-w-7xl mx-auto">
                    {/* Category filter bar */}
                    {categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8 items-center">
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1"><Tag size={12} /> Lọc theo:</span>
                            <button
                                onClick={() => setFilterCategoryId(null)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition ${
                                    !filterCategoryId ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                Tất cả ({courses.length})
                            </button>
                            {categories.map(cat => {
                                const cfg = getCategoryColorConfig(cat.color);
                                const count = courses.filter(c => c.categoryIds?.includes(cat.id)).length;
                                if (count === 0) return null;
                                const active = filterCategoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setFilterCategoryId(active ? null : cat.id)}
                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all ${
                                            active
                                                ? `${cfg.bg} ${cfg.text} ${cfg.border} scale-105 shadow-sm`
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span>{cat.emoji}</span>
                                        <span>{typeof cat.name === 'string' ? cat.name : cat.name.vi}</span>
                                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/40' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#1A73E8]" size={32} /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses
                                .filter(c => !filterCategoryId || c.categoryIds?.includes(filterCategoryId))
                                .map((course) => {
                                const isEnrolled = userEnrollments.includes(course.id);
                                const courseCategories = categories.filter(cat => course.categoryIds?.includes(cat.id));
                                return (
                                    <div 
                                        key={course.id} 
                                        onClick={() => onNavigate('detail', course.id)}
                                        className="argon-card group overflow-hidden cursor-pointer flex flex-col hover:-translate-y-px"
                                    >
                                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                            <img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={tr_h(course.title)} />
                                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold text-[#1A73E8] uppercase">
                                                {course.videoCount} {t('landing.lessons')}
                                            </div>
                                        </div>
                                        <div className="p-6 flex-grow flex flex-col">
                                            <h3 className="text-lg font-bold text-gray-700 mb-2 line-clamp-1">{tr_h(course.title)}</h3>
                                            <p className="text-gray-600 text-sm line-clamp-2 mb-4 leading-relaxed flex-grow">{tr_h(course.description)}</p>
                                            {courseCategories.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    {courseCategories.map(cat => {
                                                        const cfg = getCategoryColorConfig(cat.color);
                                                        return (
                                                            <span key={cat.id} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                                                {cat.emoji} {typeof cat.name === 'string' ? cat.name : cat.name.vi}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                                                {isEnrolled ? (
                                                    <span className="text-[#4CAF50] font-semibold text-xs flex items-center">
                                                        <CheckCircle size={16} className="mr-1.5" /> {t('landing.participated')}
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={handleEnrollClick}
                                                        className="flex items-center text-[#1A73E8] font-semibold text-xs hover:text-blue-700 transition"
                                                    >
                                                        <MessageSquare size={16} className="mr-1.5" /> {t('landing.enroll_now')}
                                                    </button>
                                                )}
                                                <span className="text-gray-600 font-medium text-xs flex items-center">
                                                    {t('landing.detail')} <ArrowRight size={14} className="ml-1" />
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
                    <div className="argon-card w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-white relative" style={{background: 'linear-gradient(195deg, #49A3F1, #1A73E8)'}}>
                            <button onClick={() => setShowContactModal(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition">
                                <X size={20} />
                            </button>
                            <h3 className="text-2xl font-bold mb-2">Đăng ký tham gia</h3>
                            <p className="text-blue-100 text-sm">Vui lòng liên hệ với Admin qua các kênh bên dưới để được kích hoạt khóa học nhanh nhất.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <a href="tel:0901234567" className="flex items-center p-4 bg-[#F8F9FA] rounded-xl hover:bg-blue-50 transition-colors border border-gray-200 hover:border-[#1A73E8] group">
                                <div className="argon-icon-badge primary mr-4">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 uppercase">Hotline / Zalo</p>
                                    <p className="text-lg font-bold text-gray-700">090 123 4567</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-400 group-hover:text-[#1A73E8] transition-transform" size={20} />
                            </a>

                            <a href="https://t.me/admin_id" target="_blank" className="flex items-center p-4 bg-[#F8F9FA] rounded-xl hover:bg-blue-50 transition-colors border border-gray-200 hover:border-[#1A73E8] group">
                                <div className="argon-icon-badge primary mr-4">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 uppercase">Telegram</p>
                                    <p className="text-lg font-bold text-gray-700">@admin_videohub</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-400 group-hover:text-[#1A73E8] transition-transform" size={20} />
                            </a>
                            
                            <button 
                                onClick={() => setShowContactModal(false)}
                                className="w-full py-3 mt-4 bg-gray-700 text-white rounded-lg font-semibold text-sm hover:bg-gray-800 transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="py-8 border-t border-gray-200 text-center text-gray-600 text-xs font-normal">
                <p>© 2025 {t('footer.slogan')}</p>
            </footer>
        </div>
    );
};

export default LandingPage;