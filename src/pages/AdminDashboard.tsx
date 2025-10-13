import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import CreateCourseForm from '../components/Admin/CreateCourseForm'; // Thêm Component mới
import { type Course, subscribeToCourses } from '../services/firebase'; // Thêm Course và subscribeToCourses

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(true); // Hiển thị Form mặc định

    // =================================================================
    // Lắng nghe Real-time danh sách Khóa học
    // =================================================================
    useEffect(() => {
        setLoadingCourses(true);
        let unsubscribe = () => {};
        
        try {
            // subscribeToCourses được định nghĩa trong firebase.ts và đã được kiểm tra
            unsubscribe = subscribeToCourses((fetchedCourses) => {
                setCourses(fetchedCourses);
                setLoadingCourses(false);
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Khóa học:", e);
            setLoadingCourses(false);
        }

        // Cleanup: Hủy lắng nghe khi component unmount
        return () => unsubscribe();
    }, []); 

    const handleCourseCreated = useCallback(() => {
        // Có thể thêm logic thông báo hoặc đóng form
        console.log("Khóa học mới được tạo, danh sách sẽ tự động cập nhật.");
        // setShowCreateForm(false); // Có thể ẩn form sau khi tạo nếu muốn
    }, []);

    const CourseList = () => {
        if (loadingCourses) {
            return <p className="text-center text-gray-500">Đang tải danh sách khóa học...</p>;
        }

        if (courses.length === 0) {
            return <p className="text-center text-gray-500">Chưa có khóa học nào. Hãy tạo khóa học đầu tiên!</p>;
        }

        return (
            <div className="space-y-4">
                {courses.map((course) => (
                    <div key={course.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
                        <h4 className="text-lg font-semibold text-indigo-800">{course.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{course.description}</p>
                        <p className="text-xs text-gray-400">
                            ID: {course.id} | Video: {course.videoCount} | Admin: {course.adminId}
                        </p>
                        {/* Level 3: Nút Chỉnh sửa/Quản lý Video sẽ ở đây */}
                        <button 
                            className="mt-2 text-sm text-indigo-500 hover:text-indigo-700 font-medium"
                            onClick={() => alert(`Quản lý Video cho khóa học: ${course.title}`)}
                        >
                            Quản lý Video (Level 3)
                        </button>
                    </div>
                ))}
            </div>
        );
    };

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
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Phần Form Tạo Khóa học */}
                    {showCreateForm && (
                        <div className="p-6 bg-white rounded-xl shadow-2xl border-t-4 border-indigo-600">
                            <CreateCourseForm 
                                user={user} 
                                onCourseCreated={handleCourseCreated} 
                            />
                        </div>
                    )}
                    
                    {/* Phần Danh sách Khóa học */}
                    <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-green-600">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Danh sách Khóa học ({courses.length})</h2>
                        <CourseList />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;