import React from 'react';
import { type User } from 'firebase/auth';

// Định nghĩa props để nhận hàm điều hướng từ App.tsx
// Các trang đích có thể là 'login' hoặc 'register'
interface LandingPageProps {
    onNavigate: (page: 'landing' | 'register' | 'login') => void;
    user: User | null; // Cho phép truyền thông tin người dùng
    onLogout: () => Promise<void>; // Cho phép truyền hàm đăng xuất
}

// Nằm sau interface LandingPageProps
export default function LandingPage({ onNavigate, user, onLogout }: LandingPageProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
                <h1 className="text-4xl font-extrabold text-indigo-700 mb-6 text-center">
                    Tài Chính Cá Nhân [Tên App]
                </h1>

                {user ? (
                    // --- HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP ---
                    <div className="text-center">
                        <p className="text-lg font-semibold text-green-600 mb-4">
                            Đã Đăng nhập thành công!
                        </p>
                        <p className="text-sm text-gray-700 mb-6">
                            UID: <span className="font-mono bg-gray-100 p-1 rounded-md text-sm break-all">{user.uid}</span>
                        </p>
                        <p className="text-md text-gray-600 mb-8">
                            Bây giờ bạn có thể bắt đầu xây dựng Dashboard!
                        </p>

                        <button
                            onClick={onLogout}
                            className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-bold hover:bg-red-600 transition duration-200 shadow-md"
                        >
                            Đăng Xuất
                        </button>
                    </div>
                ) : (
                    // --- HIỂN THỊ KHI CHƯA ĐĂNG NHẬP ---
                    <div className="space-y-4">
                        <button
                            onClick={() => onNavigate('login')}
                            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-indigo-700 transition duration-200 shadow-md"
                        >
                            Đăng Nhập
                        </button>
                        <button
                            onClick={() => onNavigate('register')}
                            className="w-full bg-gray-200 text-indigo-600 py-3 px-6 rounded-lg font-bold hover:bg-gray-300 transition duration-200 shadow-md"
                        >
                            Đăng Ký
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
