import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import CreateCourseForm from '../components/Admin/CreateCourseForm'; 
import CreateVideoForm from '../components/Admin/CreateVideoForm'; // Import component mới
import CourseCard from '../components/Admin/CourseCard'; // Import component mới
import { type Course, subscribeToCourses } from '../services/firebase'; 

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false); // Ẩn Form tạo Khóa học mặc định
    
    // TRẠNG THÁI MỚI: Theo dõi Khóa học đang được chọn để quản lý Video
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null); 

    // =================================================================
    // Lắng nghe Real-time danh sách Khóa học
    // =================================================================
    useEffect(() => {
        setLoadingCourses(true);
        let unsubscribe = () => {};
        
        try {
            unsubscribe = subscribeToCourses((fetchedCourses) => {
                setCourses(fetchedCourses);
                setLoadingCourses(false);

                // Cập nhật lại selectedCourse nếu nó đã được chọn và vẫn còn trong danh sách
                if (selectedCourse) {
                    const updatedCourse = fetchedCourses.find(c => c.id === selectedCourse.id);
                    // Giữ nguyên trạng thái selectedCourse nếu nó được tìm thấy (để cập nhật videoCount)
                    if (updatedCourse) {
                        setSelectedCourse(updatedCourse);
                    } else {
                        // Nếu khóa học bị xóa, reset trạng thái
                        setSelectedCourse(null);
                    }
                }
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Khóa học:", e);
            setLoadingCourses(false);
        }

        // Cleanup function
        return () => unsubscribe();
    }, [selectedCourse]); // Thêm selectedCourse vào dependency để cập nhật khi danh sách thay đổi

    // Hàm xử lý khi Khóa học được tạo
    const handleCourseCreated = useCallback(() => {
        setShowCreateForm(false); // Đóng form tạo Khóa học sau khi tạo
    }, []);
    
    // Hàm xử lý khi Admin nhấn "Quản lý Video"
    const handleManageVideos = useCallback((course: Course) => {
        // Nếu nhấn lại chính khóa học đó, đóng form quản lý video (toggle)
        if (selectedCourse?.id === course.id) {
            setSelectedCourse(null);
        } else {
            setSelectedCourse(course);
        }
        setShowCreateForm(false); // Luôn đóng form tạo khóa học khi quản lý video
    }, [selectedCourse]);

    // Hàm đóng Form tạo Video
    const handleCloseVideoForm = useCallback(() => {
        setSelectedCourse(null);
    }, []);

    const CourseList = () => {
        if (loadingCourses) {
            return <p className="text-center text-gray-500">Đang tải danh sách khóa học...</p>;
        }

        if (courses.length === 0) {
            return <p className="text-center text-gray-500">Chưa có khóa học nào. Hãy tạo khóa học đầu tiên!</p>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                    <CourseCard 
                        key={course.id}
                        course={course}
                        onManageVideos={handleManageVideos}
                        isSelected={selectedCourse?.id === course.id}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-indigo-50 flex flex-col font-sans">
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
                    {/* KHU VỰC THAO TÁC (Tạo Khóa học HOẶC Tạo Video) */}
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={() => {
                                setShowCreateForm(!showCreateForm);
                                setSelectedCourse(null); // Đóng form video khi mở form khóa học
                            }}
                            className="py-2 px-4 bg-indigo-500 text-white rounded-lg shadow-md hover:bg-indigo-600 transition"
                        >
                            {showCreateForm ? 'Đóng Form Khóa học' : '➕ Mở Form Tạo Khóa học'}
                        </button>
                    </div>

                    {/* HIỂN THỊ FORM TẠO KHÓA HỌC */}
                    {showCreateForm && (
                        <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-600">
                            <CreateCourseForm 
                                user={user} 
                                onCourseCreated={handleCourseCreated} 
                            />
                        </div>
                    )}
                    
                    {/* HIỂN THỊ FORM TẠO VIDEO CHO KHÓA HỌC ĐÃ CHỌN */}
                    {selectedCourse && (
                         // Form tạo Video sẽ thay thế Form tạo Khóa học (hoặc ngược lại)
                         <div className="bg-white rounded-xl shadow-2xl border-t-4 border-purple-600">
                            <CreateVideoForm
                                courseId={selectedCourse.id}
                                courseTitle={selectedCourse.title}
                                adminUser={user}
                                onVideoCreated={() => {
                                    // Không cần làm gì nhiều ở đây vì onSnapshot sẽ tự cập nhật videoCount
                                }} 
                                onClose={handleCloseVideoForm}
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
