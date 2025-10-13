import React from 'react';
import { type User } from 'firebase/auth';

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
    return (
        <div className="min-h-screen w-full bg-indigo-50 flex flex-col">
            {/* Header */}
            <header className="bg-indigo-700 shadow-lg p-4 flex justify-between items-center w-full">
                <h1 className="text-2xl font-bold text-white">Quản trị Hệ thống (Admin)</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-indigo-200 font-medium">Quản trị viên: {user.displayName || user.email}</span>
                    <button
                        onClick={onLogout}
                        className="py-1 px-3 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition duration-200"
                    >
                        Đăng xuất
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-8">
                <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-600">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        [BASELINE] Admin Dashboard
                    </h2>
                    <p className="text-green-600 font-semibold mb-3">
                        Chúc mừng! Bạn đã đăng nhập thành công với vai trò **ADMIN**.
                    </p>
                    <p className="text-gray-600">
                        ID người dùng (UID): {user.uid}
                    </p>
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-semibold text-blue-800">Cần làm:</p>
                        <p className="text-blue-700 text-sm">Ở Level 2, chúng ta sẽ thêm tính năng Quản lý Khóa học và Video tại giao diện này.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
