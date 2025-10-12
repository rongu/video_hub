import React, { useState } from 'react';
import { createUserWithEmailAndPassword, type AuthError } from 'firebase/auth';
import { getFirebaseAuth } from '../services/firebase.ts'; // Đã thay đổi

interface RegisterPageProps {
    onNavigate: (page: 'landing' | 'register' | 'login') => void;
}

export default function RegisterPage({ onNavigate }: RegisterPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const auth = getFirebaseAuth(); // Lấy Auth instance TẠI THỜI ĐIỂM gọi hàm
        if (!auth) {
            // Lỗi này giờ chỉ xuất hiện nếu Firebase App init bị thất bại
            setError("Lỗi: Dịch vụ Firebase Auth chưa sẵn sàng. Vui lòng thử lại.");
            return;
        }

        if (password.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        setIsLoading(true);

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // App.tsx sẽ xử lý chuyển hướng sau khi đăng ký thành công
        } catch (err) {
            const firebaseError = err as AuthError;
            console.error("Lỗi Đăng ký:", firebaseError.code, firebaseError.message);
            
            if (firebaseError.code === 'auth/email-already-in-use') {
                setError('Email này đã được sử dụng. Vui lòng thử email khác.');
            } else {
                setError('Đăng ký thất bại. Vui lòng kiểm tra email và mật khẩu.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-indigo-600 mb-6 text-center">
                    Tạo Tài Khoản Mới
                </h1>
                
                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mật khẩu (ít nhất 6 ký tự)</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {error && (
                        <p className="text-red-600 text-sm font-medium p-3 bg-red-50 rounded-lg border border-red-200">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition duration-200 shadow-md disabled:bg-indigo-400"
                    >
                        {isLoading ? 'Đang đăng ký...' : 'Đăng Ký'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => onNavigate('login')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                        Đã có tài khoản? Đăng nhập ngay.
                    </button>
                </div>
            </div>
        </div>
    );
}
