import React from 'react';
import { type User } from 'firebase/auth';

interface LandingPageProps {
    onNavigate: (page: 'login' | 'register') => void;
    user: User | null;
    onLogout: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, user, onLogout }) => {
    return (
        <div className="max-w-md w-full p-8 bg-white shadow-xl rounded-xl">
            <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">
                Chào mừng đến với Video Hub
            </h1>

            {/* Hiển thị khi đã đăng nhập (sẽ ít khi thấy do App.tsx tự điều hướng) */}
            {user ? (
                <div className="text-center">
                    <p className="text-gray-600 mb-4">
                        Bạn đã đăng nhập dưới tên: <strong>{user.displayName || user.email}</strong>
                    </p>
                    <button
                        onClick={onLogout}
                        className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-200"
                    >
                        Đăng xuất
                    </button>
                </div>
            ) : (
                /* Hiển thị khi chưa đăng nhập */
                <div className="space-y-4">
                    <p className="text-center text-gray-500">
                        Vui lòng đăng nhập hoặc đăng ký để tiếp tục.
                    </p>
                    <button
                        onClick={() => onNavigate('login')}
                        className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200"
                    >
                        Đăng nhập
                    </button>
                    <button
                        onClick={() => onNavigate('register')}
                        className="w-full py-2 px-4 bg-gray-200 text-indigo-600 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-200"
                    >
                        Đăng ký tài khoản mới
                    </button>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
