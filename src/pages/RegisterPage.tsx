import React, { useState } from 'react';
import { handleRegister } from '../services/firebase';

interface RegisterPageProps {
    onNavigate: (page: 'landing' | 'login') => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await handleRegister(email, password, displayName);
            // App.tsx sẽ tự động điều hướng đến trang UserCoursesPage
        } catch (err: any) {
            console.error("Registration Error:", err);
            setError("Đăng ký thất bại. Vui lòng kiểm tra thông tin và thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full p-8 bg-white shadow-xl rounded-xl">
            <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">Đăng ký tài khoản</h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <p className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</p>
                )}

                <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="displayName">Tên hiển thị</label>
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                
                <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                
                <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="password">Mật khẩu (Tối thiểu 6 ký tự)</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
                >
                    {loading ? 'Đang tải...' : 'Đăng ký'}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <button
                    onClick={() => onNavigate('login')}
                    className="text-indigo-600 font-medium hover:text-indigo-500"
                    disabled={loading}
                >
                    Đăng nhập
                </button>
            </p>
        </div>
    );
};

export default RegisterPage;
