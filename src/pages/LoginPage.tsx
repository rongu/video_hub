import React, { useState, useCallback } from 'react';
import { Mail, Lock, LogIn, ArrowLeft, Loader2 } from 'lucide-react';
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
        <div className="flex items-center justify-center min-h-screen w-full p-4 bg-[#F8F9FA]">
            <div className="argon-card p-8 md:p-10 max-w-md w-full space-y-6">
                
                <div className="text-center">
                    <div className="argon-icon-badge primary mx-auto mb-4">
                        <LogIn size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-700">Đăng nhập</h2>
                    <p className="text-gray-600 text-sm mt-1">Chào mừng quay lại VideoHub</p>
                </div>
                
                {error && (
                    <div className="bg-red-50 border-l-4 border-[#F44336] text-red-700 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="argon-input pl-10"
                            disabled={loading}
                        />
                    </div>
                    <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="argon-input pl-10"
                            disabled={loading}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="argon-button-gradient w-full py-3 text-sm flex items-center justify-center"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin mr-2"/> : <LogIn size={18} className="mr-2"/>}
                        {loading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
                    </button>
                </form>

                <div className="text-center text-sm space-y-2">
                    <p className="text-gray-600">
                        Chưa có tài khoản?
                        <button 
                            onClick={() => handleNavigate('register')}
                            className="text-[#1A73E8] font-semibold hover:text-blue-700 ml-1 transition"
                        >
                            Đăng ký
                        </button>
                    </p>
                    <button 
                        onClick={() => handleNavigate('landing')}
                        className="text-gray-600 font-medium hover:text-gray-700 mt-2 flex items-center justify-center mx-auto transition"
                    >
                        <ArrowLeft size={16} className="mr-1"/> Quay lại trang chính
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;