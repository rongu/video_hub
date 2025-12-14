import React, { useState, useCallback } from 'react';
import { Mail, Lock, LogIn, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { handleLogin } from '../services/firebase';

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface LoginPageProps {
    onNavigate: (page: Page, courseId?: string | null) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await handleLogin(email, password);
            // AuthStateChanged trong App.tsx sẽ tự động chuyển hướng
        } catch (err: any) {
            console.error(err);
            // Xử lý lỗi Firebase cụ thể
            let errorMessage = "Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.";
            if (err.code === 'auth/invalid-credential') {
                 errorMessage = "Email hoặc mật khẩu không chính xác.";
            } else if (err.code === 'auth/user-not-found') {
                 errorMessage = "Tài khoản không tồn tại.";
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    // ✅ SỬ DỤNG ONNAVIGATE MỚI
    const handleNavigate = useCallback((page: Page) => {
        onNavigate(page);
    }, [onNavigate]);


    return (
        <div className="flex items-center justify-center min-h-screen w-full p-4">
            <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl border-t-8 border-indigo-600 max-w-md w-full space-y-6">
                
                <h2 className="text-3xl font-extrabold text-indigo-700 text-center flex items-center justify-center">
                    <LogIn size={28} className="mr-3"/> Đăng nhập
                </h2>
                
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                            disabled={loading}
                        />
                    </div>
                    <div className="relative">
                        <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition"
                            disabled={loading}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg text-white font-semibold text-lg transition duration-200 flex items-center justify-center ${
                            loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'
                        }`}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin mr-2"/> : <LogIn size={20} className="mr-2"/>}
                        {loading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
                    </button>
                </form>

                <div className="text-center text-sm space-y-2">
                    <p className="text-gray-600">
                        Chưa có tài khoản?
                        <button 
                            onClick={() => handleNavigate('register')}
                            className="text-indigo-600 font-medium hover:text-indigo-800 ml-1 transition"
                        >
                            Đăng ký
                        </button>
                    </p>
                    <button 
                        onClick={() => handleNavigate('landing')}
                        className="text-gray-500 font-medium hover:text-gray-700 mt-2 flex items-center justify-center mx-auto"
                    >
                        <ArrowLeft size={16} className="mr-1"/> Quay lại trang chính
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;