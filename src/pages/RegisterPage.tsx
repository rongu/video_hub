import React, { useState, useCallback } from 'react';
import { Mail, Lock, UserPlus, ArrowLeft, Loader2, User as UserIcon } from 'lucide-react';
import { handleRegister } from '../services/firebase';

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface RegisterPageProps {
    onNavigate: (page: Page, courseId?: string | null) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await handleRegister(email, password, displayName);
            // Sau khi đăng ký thành công, chuyển hướng đến trang Đăng nhập
            handleNavigate('login');
        } catch (err: any) {
            console.error(err);
             // Xử lý lỗi Firebase cụ thể
            let errorMessage = "Đăng ký thất bại. Vui lòng thử lại.";
            if (err.code === 'auth/email-already-in-use') {
                 errorMessage = "Email này đã được sử dụng. Vui lòng đăng nhập.";
            } else if (err.code === 'auth/weak-password') {
                 errorMessage = "Mật khẩu phải có ít nhất 6 ký tự.";
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
            <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl border-t-8 border-green-600 max-w-md w-full space-y-6">
                
                <h2 className="text-3xl font-extrabold text-green-700 text-center flex items-center justify-center">
                    <UserPlus size={28} className="mr-3"/> Đăng ký
                </h2>
                
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <UserIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="Tên hiển thị"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition"
                            disabled={loading}
                        />
                    </div>
                    <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition"
                            disabled={loading}
                        />
                    </div>
                    <div className="relative">
                        <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="password"
                            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition"
                            minLength={6}
                            disabled={loading}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg text-white font-semibold text-lg transition duration-200 flex items-center justify-center ${
                            loading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'
                        }`}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin mr-2"/> : <UserPlus size={20} className="mr-2"/>}
                        {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                    </button>
                </form>

                <div className="text-center text-sm space-y-2">
                    <p className="text-gray-600">
                        Đã có tài khoản?
                        <button 
                            onClick={() => handleNavigate('login')}
                            className="text-indigo-600 font-medium hover:text-indigo-800 ml-1 transition"
                        >
                            Đăng nhập
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

export default RegisterPage;