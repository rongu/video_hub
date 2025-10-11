import React, { useState } from 'react';

// Định nghĩa các loại trang mà ứng dụng có thể chuyển đến
type Page = 'landing' | 'login' | 'register' | 'dashboard';

interface RegisterPageProps {
  onNavigate: (page: Page) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
    // State quản lý dữ liệu form
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    // Hàm thay thế alert() để thông báo lỗi trong môi trường iframe
    const notifyError = (message: string) => {
      setError(message);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password || !confirmPassword) {
            notifyError('Vui lòng điền đầy đủ tất cả các trường.');
            return;
        }

        if (password.length < 6) {
            notifyError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        if (password !== confirmPassword) {
            notifyError('Mật khẩu xác nhận không khớp.');
            return;
        }

        // --- Logic Đăng Ký Firebase sẽ được thêm ở bước 2 ---
        console.log('Dữ liệu đăng ký hợp lệ (UI check):', { email, password });
        
        // Tạm thời điều hướng về trang đăng nhập sau khi "đăng ký" thành công
        notifyError('Đăng ký UI thành công. Chuyển sang trang Đăng Nhập.');
        // Giả lập độ trễ ngắn để người dùng kịp đọc thông báo
        setTimeout(() => {
          onNavigate('login');
        }, 1500);
    };
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4 font-sans">
            <div className="bg-gray-800 p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-sm border border-pink-600/50">
                <h2 className="text-3xl font-bold mb-6 text-center text-pink-400">Đăng Ký Tài Khoản</h2>

                {/* Thông báo lỗi/thành công */}
                {error && (
                    <div className={`p-3 rounded-lg mb-4 text-sm border ${error.includes('thành công') ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-red-900/40 text-red-300 border-red-700'}`}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Trường Email */}
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="vd: user@email.com"
                            required
                            className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                        />
                    </div>

                    {/* Trường Mật khẩu */}
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="password">
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="ít nhất 6 ký tự"
                            required
                            className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                        />
                    </div>

                    {/* Trường Xác nhận Mật khẩu */}
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="confirmPassword">
                            Xác nhận Mật khẩu
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="nhập lại mật khẩu"
                            required
                            className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                        />
                    </div>

                    {/* Nút Đăng Ký */}
                    <button
                        type="submit"
                        className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg shadow-lg transition duration-200 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-pink-500/50 mt-6"
                    >
                        Đăng Ký
                    </button>
                </form>

                {/* Chuyển hướng */}
                <p className="text-center text-gray-400 text-sm mt-6">
                    Đã có tài khoản?{' '}
                    <button
                        onClick={() => onNavigate('login')}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold transition duration-150"
                    >
                        Đăng Nhập ngay
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
