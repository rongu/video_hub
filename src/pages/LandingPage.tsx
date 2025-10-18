import React, { useEffect, useState, useCallback } from 'react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { type Course, subscribeToCourses } from '../services/firebase';
import CourseListItem from '../components/User/CourseListItem';

interface LandingPageProps {
    onNavigate: (page: 'login' | 'register') => void;
    // user và onLogout chỉ là props dummy để giữ tính nhất quán với App.tsx, 
    // nhưng trong LandingPage thì user luôn là null.
    user: null; 
    onLogout: () => Promise<void>; 
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    // =================================================================
    // Lắng nghe Real-time danh sách Khóa học (Giống HomePage)
    // =================================================================
    useEffect(() => {
        setLoading(true);
        let unsubscribe = () => {};
        
        try {
            // Guest vẫn cần xem danh sách khóa học
            unsubscribe = subscribeToCourses((fetchedCourses) => {
                setCourses(fetchedCourses);
                setLoading(false);
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Khóa học:", e);
            setLoading(false);
        }

        return () => unsubscribe();
    }, []); 

    // Tạm thời tạo hàm dummy cho việc xem khóa học.
    // Guest sẽ không được xem chi tiết mà sẽ được nhắc đăng nhập.
    const handleViewCourse = useCallback((course: Course) => {
        console.log(`Guest muốn xem khóa học ID: ${course.id}. Nhắc đăng nhập/đăng ký.`);
        // Hiển thị thông báo và chuyển hướng đăng nhập
        onNavigate('login');
        // TODO: Cải tiến UI: Hiển thị modal thông báo trước khi chuyển hướng.
    }, [onNavigate]);

    // =================================================================
    // HIỂN THỊ UI
    // =================================================================

    return (
        <div className="min-h-screen w-full bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white shadow-md p-4 flex justify-between items-center w-full sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-indigo-700">🚀 Video Hub</h1>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => onNavigate('login')} 
                        className="flex items-center bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-indigo-600 transition"
                    >
                        <LogIn className="h-4 w-4 mr-1"/> Đăng nhập
                    </button>
                    <button 
                        onClick={() => onNavigate('register')} 
                        className="flex items-center bg-gray-300 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold hover:bg-gray-400 transition"
                    >
                        <UserPlus className="h-4 w-4 mr-1"/> Đăng ký
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 sm:p-8 max-w-6xl mx-auto w-full">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-indigo-300 pb-2 text-center sm:text-left">
                    Khám phá các Khóa học Hiện có
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
                                onViewCourse={handleViewCourse} // Hàm này sẽ chuyển hướng Guest đến Login
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

export default LandingPage;
