import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, type UserCredential } from 'firebase/auth';

// Định nghĩa props cho Component, bao gồm hàm điều hướng
interface LoginPageProps {
    path?: string; // Dùng cho Router (tùy chọn)
    onNavigate: (page: 'landing' | 'register' | 'login' | 'dashboard') => void;
}

// Lấy thông tin cấu hình Firebase đã được cung cấp
declare const __firebase_config: string;
declare const __initial_auth_token: string;
declare const __app_id: string;

// Hàm hỗ trợ delay cho Exponential Backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
    // State quản lý form
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // State quản lý trạng thái tải (loading) và lỗi (error)
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Xử lý đăng nhập
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Kiểm tra cơ bản
        if (!email || !password) {
            setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
            return;
        }

        setIsLoading(true);

        try {
            // Lấy instance của Auth
            const auth = getAuth();
            
            let attempts = 0;
            const maxAttempts = 3;

            // Thực hiện gọi API với Exponential Backoff
            while (attempts < maxAttempts) {
                try {
                    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
                    
                    // Đăng nhập thành công, chuyển hướng người dùng đến Dashboard
                    console.log('Đăng nhập thành công, UID:', userCredential.user.uid);
                    //onNavigate('dashboard'); 
                    return; // Thoát khỏi vòng lặp và hàm
                } catch (apiError) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        // Nếu hết số lần thử, ném lỗi cuối cùng
                        throw apiError;
                    }
                    // Tính thời gian chờ (1s, 2s, 4s...)
                    const waitTime = Math.pow(2, attempts) * 1000;
                    console.warn(`Lỗi đăng nhập tạm thời. Thử lại sau ${waitTime / 1000} giây...`);
                    await delay(waitTime);
                }
            }
        } catch (err: any) {
            console.error('Lỗi đăng nhập:', err);
            // Xử lý thông báo lỗi thân thiện với người dùng
            let errorMessage = 'Đã xảy ra lỗi không xác định khi đăng nhập.';
            if (err.code) {
                switch (err.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = 'Email hoặc Mật khẩu không đúng. Vui lòng kiểm tra lại.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Địa chỉ Email không hợp lệ.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Tài khoản của bạn đã bị khóa tạm thời do quá nhiều lần thử sai. Vui lòng thử lại sau.';
                        break;
                    default:
                        errorMessage = 'Lỗi hệ thống Firebase: ' + err.message;
                        break;
                }
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl transition duration-500 hover:shadow-3xl">
                <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-6 font-inter">
                    Đăng Nhập Tài Khoản
                </h2>
                <p className="text-center text-sm text-gray-600 mb-8 font-inter">
                    Chào mừng trở lại! Nhập thông tin của bạn để tiếp tục.
                </p>

                <form className="space-y-6" onSubmit={handleLogin}>
                    
                    <div>
                        <label 
                            htmlFor="email" 
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Địa chỉ Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition duration-300 shadow-sm"
                            placeholder="you@example.com"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label 
                            htmlFor="password" 
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Mật khẩu
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition duration-300 shadow-sm"
                            placeholder="Mật khẩu của bạn"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Hiển thị lỗi */}
                    {error && (
                        <div className="p-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg border border-red-300 shadow-inner" role="alert">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-semibold rounded-lg text-white transition duration-300 shadow-lg transform hover:scale-[1.01] ${
                                isLoading
                                    ? 'bg-indigo-400 cursor-not-allowed opacity-80'
                                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:bg-indigo-800'
                            }`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang Đăng nhập...
                                </div>
                            ) : (
                                'Đăng Nhập'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm">
                        Chưa có tài khoản?{' '}
                        <button 
                            onClick={() => onNavigate('register')}
                            className="font-medium text-indigo-600 hover:text-indigo-500 transition duration-300 focus:outline-none"
                        >
                            Đăng ký ngay
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
