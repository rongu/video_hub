import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
// SỬA LỖI: Loại bỏ phần mở rộng .ts để khắc phục lỗi phân giải đường dẫn
import { type Course, subscribeToCourses } from '../services/firebase'; 
import CourseListItem from '../components/User/CourseListItem'; 
import { Loader2, LogOut } from 'lucide-react';

interface HomePageProps {
    user: User;
    // ĐÃ XÁC NHẬN: Prop onLogout phải có ở đây
    onLogout: () => Promise<void>; 
}

const HomePage: React.FC<HomePageProps> = ({ user, onLogout }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    // =================================================================
    // Lắng nghe Real-time danh sách Khóa học
    // =================================================================
    useEffect(() => {
        setLoading(true);
        let unsubscribe = () => {};
        
        try {
            unsubscribe = subscribeToCourses((fetchedCourses) => {
                setCourses(fetchedCourses);
                setLoading(false);
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Khóa học:", e);
            setLoading(false);
        }

        // Cleanup function
        return () => unsubscribe();
    }, []); 

    // Tạm thời tạo hàm dummy cho việc xem khóa học, sẽ triển khai ở 4.2
    const handleViewCourse = useCallback((course: Course) => {
        console.log(`[LEVEL 4.2]: Tạm thời chưa điều hướng, Course ID: ${course.id}`);
    }, []);

    // =================================================================
    // HIỂN THỊ UI
    // =================================================================
    
    return (
        <div className="min-h-screen w-full bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white shadow-md p-4 flex justify-between items-center w-full sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-indigo-700">🚀 Video Hub (Home)</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-600 font-medium hidden sm:inline">Xin chào, {user?.displayName || user?.email}</span>
                    <button 
                        onClick={onLogout} 
                        className="flex items-center bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-red-600 transition"
                    >
                        <LogOut className="h-4 w-4 mr-1"/> Đăng xuất
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 sm:p-8 max-w-6xl mx-auto w-full">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-indigo-300 pb-2">
                    Các Khóa học Hiện có
                </h2>

                {loading && (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mr-3" />
                        <span className="text-lg text-gray-600">Đang tải danh sách khóa học...</span>
                    </div>
                )}

                {!loading && courses.length === 0 && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg" role="alert">
                        <p className="font-bold">Không có Khóa học nào</p>
                        <p>Hiện tại chưa có khóa học nào được Admin tạo. Vui lòng quay lại sau!</p>
                    </div>
                )}

                {/* Danh sách Khóa học */}
                {!loading && courses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <CourseListItem 
                                key={course.id} 
                                course={course}
                                onViewCourse={handleViewCourse}
                            />
                        ))}
                    </div>
                )}
            </main>
            
            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500 mt-auto">
                &copy; {new Date().getFullYear()} Video Hub.
            </footer>
        </div>
    );
};

export default HomePage;
