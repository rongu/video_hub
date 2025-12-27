import React from 'react';
import { type User } from 'firebase/auth';

interface UserCoursesPageProps {
    user: User;
    onLogout: () => void;
}

const UserCoursesPage: React.FC<UserCoursesPageProps> = ({ user, onLogout }) => {
    return (
        <div className="min-h-screen w-full bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-md p-4 flex justify-between items-center w-full">
                <h1 className="text-2xl font-bold text-indigo-700">Video Hub - Khóa học</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-700 font-medium">Xin chào, {user.displayName || user.email}</span>
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
                <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        [BASELINE] Trang Người dùng Thường
                    </h2>
                    <p className="text-gray-600">
                        Bạn đã truy cập thành công với vai trò **USER**. Đây là nơi các khóa học sẽ được hiển thị.
                    </p>
                    <p className="mt-2 text-sm text-indigo-500">
                        ID người dùng (UID): {user.uid}
                    </p>
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="font-semibold text-yellow-800">Cần làm:</p>
                        <p className="text-yellow-700 text-sm">Ở Level 2, chúng ta sẽ xây dựng giao diện hiển thị danh sách các Khóa học công khai tại đây.</p>
                    </div>
                </div>
            </main>
            <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <p>© 2025 VideoHub. Học tập để vươn xa.</p>
            </footer>
        </div>
    );
};

export default UserCoursesPage;