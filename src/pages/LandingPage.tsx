import React, { useCallback } from 'react';
import { type User } from 'firebase/auth';
// ✅ FIX: Thêm ArrowRight vào imports
import { LogIn, UserPlus, BookOpen, ArrowRight } from 'lucide-react'; 

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface LandingPageProps {
    user: User | null;
    onLogout: () => Promise<void>;
    onNavigate: (page: Page, courseId?: string | null) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ user, onNavigate }) => {
    
    const handleLoginClick = useCallback(() => {
        // SỬ DỤNG ONNAVIGATE MỚI (Cập nhật URL)
        onNavigate('login');
    }, [onNavigate]);

    const handleRegisterClick = useCallback(() => {
        // SỬ DỤNG ONNAVIGATE MỚI (Cập nhật URL)
        onNavigate('register');
    }, [onNavigate]);

    const handleHomeClick = useCallback(() => {
        // SỬ DỤNG ONNAVIGATE MỚI (Cập nhật URL)
        onNavigate('home');
    }, [onNavigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-indigo-50 w-full font-sans">
            <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl border-t-8 border-indigo-600 max-w-lg w-full text-center space-y-6 transform hover:shadow-3xl transition duration-500">
                
                <BookOpen size={64} className="mx-auto text-indigo-600"/>
                <h1 className="text-4xl font-extrabold text-gray-800">Video Hub</h1>
                <p className="text-xl text-gray-600">Nền tảng học tập trực tuyến dành cho mọi người.</p>

                <div className="pt-4 space-y-4">
                    {user ? (
                        // Nếu đã đăng nhập, chuyển đến Trang chủ
                        <button
                            onClick={handleHomeClick}
                            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg text-lg hover:bg-green-700 transition duration-200 shadow-md flex items-center justify-center"
                        >
                            Tiếp tục học tập
                            <ArrowRight size={20} className="ml-2"/>
                        </button>
                    ) : (
                        // Nếu chưa đăng nhập, hiển thị nút Đăng nhập/Đăng ký
                        <>
                            <button
                                onClick={handleLoginClick}
                                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg text-lg hover:bg-indigo-700 transition duration-200 shadow-md flex items-center justify-center"
                            >
                                <LogIn size={20} className="mr-2"/> Đăng nhập
                            </button>
                            <button
                                onClick={handleRegisterClick}
                                className="w-full py-3 border border-indigo-600 text-indigo-600 font-semibold rounded-lg text-lg hover:bg-indigo-50 transition duration-200 flex items-center justify-center"
                            >
                                <UserPlus size={20} className="mr-2"/> Đăng ký tài khoản
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;