import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
// ĐÃ SỬA LỖI: Thay đổi đường dẫn import từ '../' thành './' để khắc phục lỗi không phân giải module
import CreateCourseForm from '../components/Admin/CreateCourseForm'; 
import CreateVideoForm from '../components/Admin/CreateVideoForm'; 
import CourseCard from '../components/Admin/CourseCard'; 
import VideoList from '../components/Admin/VideoList';
import { type Course, subscribeToCourses } from '../services/firebase'; 
import { Plus } from 'lucide-react';

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface AdminDashboardProps {
    user: User;
    onLogout: () => Promise<void>;
    onNavigate: (page: Page, courseId?: string | null) => void; 
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onNavigate }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false); 
    
    // TRẠNG THÁI MỚI: Theo dõi Khóa học đang được chọn để quản lý Video
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null); 
    
    // Thêm state để theo dõi việc tạo/cập nhật video, giúp kích hoạt VideoList reload (nếu cần)
    const [videoUpdateKey, setVideoUpdateKey] = useState(0); 

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

                // Sử dụng functional update để cập nhật selectedCourse an toàn
                setSelectedCourse(prevSelectedCourse => {
                    if (prevSelectedCourse) {
                        const updatedCourse = fetchedCourses.find(c => c.id === prevSelectedCourse.id);
                        // Giữ lại tham chiếu mới nếu khóa học tồn tại, nếu không thì reset
                        return updatedCourse || null; 
                    }
                    return prevSelectedCourse; // Giữ nguyên null nếu chưa có khóa học nào được chọn
                });
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Khóa học:", e);
            setLoadingCourses(false);
        }

        // Cleanup function
        return () => unsubscribe();
    }, []); 

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

    // Hàm đóng Form tạo Video (sau khi tạo xong hoặc nhấn X)
    const handleCloseVideoForm = useCallback(() => {
        setSelectedCourse(null);
    }, []);

    // Hàm được gọi khi một video được tạo thành công
    const handleVideoCreated = useCallback(() => {
        setVideoUpdateKey(prev => prev + 1); // Tăng key để force refresh VideoList (nếu cần thiết)
        // Không đóng form để admin có thể tải video tiếp
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
                    <span className="text-indigo-200 font-medium hidden sm:inline">Quản trị viên: {user.displayName || user.email}</span>
                    <button
                        onClick={onLogout}
                        className="py-1 px-3 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition duration-200"
                    >
                        Đăng xuất
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 sm:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* KHU VỰC THAO TÁC (Tạo Khóa học) */}
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={() => {
                                setShowCreateForm(!showCreateForm);
                                setSelectedCourse(null); // Đóng form video khi mở form khóa học
                            }}
                            className="py-2 px-4 bg-indigo-500 text-white rounded-lg shadow-md hover:bg-indigo-600 transition flex items-center"
                        >
                            <Plus size={20} className="mr-2"/> 
                            {showCreateForm ? 'Đóng Form Khóa học' : 'Tạo Khóa học mới'}
                        </button>
                    </div>

                    {/* HIỂN THỊ FORM TẠO KHÓA HỌC */}
                    {showCreateForm && (
                        <div className="flex justify-center">
                            <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-600">
                                <CreateCourseForm 
                                    user={user} 
                                    onCourseCreated={handleCourseCreated} 
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* HIỂN THỊ KHU VỰC QUẢN LÝ VIDEO (Tạo + Danh sách) */}
                    {selectedCourse && (
                         <div className="bg-white rounded-xl shadow-2xl border-t-4 border-purple-600 p-6 space-y-8">
                            <h2 className="text-2xl font-bold text-purple-700 border-b pb-3">Quản lý Video cho khóa học: "{selectedCourse.title}"</h2>
                            
                            {/* Form tạo Video */}
                            <CreateVideoForm
                                courseId={selectedCourse.id}
                                courseTitle={selectedCourse.title}
                                adminUser={user}
                                onVideoCreated={handleVideoCreated} // Kích hoạt cập nhật danh sách
                                onClose={handleCloseVideoForm}
                            />
                            
                            {/* Danh sách Video */}
                            <VideoList 
                                key={selectedCourse.id + videoUpdateKey} // Sử dụng key để reset component khi chọn khóa học khác hoặc video mới được tạo
                                courseId={selectedCourse.id} 
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
