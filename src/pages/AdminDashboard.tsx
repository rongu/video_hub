import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import CreateCourseForm from '../components/Admin/CreateCourseForm'; 
import CreateVideoForm from '../components/Admin/CreateVideoForm'; 
import CourseCard from '../components/Admin/CourseCard'; 
import VideoList from '../components/Admin/VideoList';
// GIẢ ĐỊNH: Các service cần thiết (updateCourse, deleteCourse, v.v...) đã được thêm vào firebase.ts
import { type Course, subscribeToCourses } from '../services/firebase'; 
import { Plus, X } from 'lucide-react';

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface AdminDashboardProps {
    user: User;
    onLogout: () => Promise<void>;
    onNavigate: (page: Page, courseId?: string | null) => void; 
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onNavigate }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    
    // TRẠNG THÁI MỚI: Theo dõi Khóa học đang được chỉnh sửa (nếu null là chế độ tạo mới)
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [showCourseForm, setShowCourseForm] = useState(false); // Dùng để đóng mở Form Khóa học
    
    // Theo dõi Khóa học đang được chọn để quản lý Video
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null); 
    
    // Key để force reload VideoList (khi tạo/cập nhật/xóa video)
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

                // Cập nhật selectedCourse an toàn khi danh sách thay đổi
                setSelectedCourse(prevSelectedCourse => {
                    if (prevSelectedCourse) {
                        const updatedCourse = fetchedCourses.find(c => c.id === prevSelectedCourse.id);
                        // Giữ lại tham chiếu mới nếu khóa học tồn tại, nếu không thì reset
                        return updatedCourse || null; 
                    }
                    return prevSelectedCourse; 
                });
                
                // Cập nhật courseToEdit an toàn khi danh sách thay đổi (dùng khi form đang mở)
                setCourseToEdit(prevCourseToEdit => {
                    if (prevCourseToEdit) {
                        const updatedCourse = fetchedCourses.find(c => c.id === prevCourseToEdit.id);
                        return updatedCourse || null;
                    }
                    return null;
                });
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Khóa học:", e);
            setLoadingCourses(false);
        }

        // Cleanup function
        return () => unsubscribe();
    }, []); 

    // =================================================================
    // Handlers cho CRUD Khóa học
    // =================================================================

    // Hàm mở Form Tạo Khóa học mới
    const handleStartCreateCourse = useCallback(() => {
        setCourseToEdit(null);
        setSelectedCourse(null);
        setShowCourseForm(true);
    }, []);

    // Hàm mở Form Chỉnh sửa Khóa học
    const handleEditCourse = useCallback((course: Course) => {
        setCourseToEdit(course);
        setSelectedCourse(null); // Đóng form quản lý video nếu đang mở
        setShowCourseForm(true); // Mở form chỉnh sửa
    }, []);

    // Hàm xử lý sau khi Khóa học được tạo HOẶC cập nhật
    const handleCourseSaved = useCallback(() => {
        setCourseToEdit(null); 
        setShowCourseForm(false); // Đóng form
    }, []);
    
    // Hàm xử lý Xóa Khóa học (Giả định hàm deleteCourse đã có trong services/firebase)
    const handleDeleteCourse = useCallback(async (course: Course) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${course.title}" và tất cả video của nó không?`)) {
            try {
                // GIẢ ĐỊNH: Hàm deleteCourse tồn tại và xử lý xóa cả video
                // await deleteCourse(courseId);
                console.log(`Đã xóa khóa học có ID: ${course.title}`); 
                // Sau khi xóa, state courses sẽ tự cập nhật nhờ lắng nghe real-time
                if (selectedCourse?.id === course.id) {
                    setSelectedCourse(null);
                }
            } catch (error) {
                console.error("Lỗi khi xóa khóa học:", error);
                alert("Không thể xóa khóa học. Vui lòng thử lại.");
            }
        }
    }, [selectedCourse]);


    // =================================================================
    // Handlers cho Quản lý Video
    // =================================================================
    
    // Hàm xử lý khi Admin nhấn "Quản lý Video"
    const handleManageVideos = useCallback((course: Course) => {
        // Toggle: Nếu nhấn lại chính khóa học đó, đóng form quản lý video
        if (selectedCourse?.id === course.id) {
            setSelectedCourse(null);
        } else {
            setSelectedCourse(course);
        }
        setShowCourseForm(false); // Luôn đóng form khóa học khi quản lý video
        setCourseToEdit(null); // Đảm bảo form khóa học không ở chế độ edit
    }, [selectedCourse]);

    // Hàm đóng Form tạo Video/Quản lý Video (sau khi tạo xong hoặc nhấn X)
    const handleCloseVideoForm = useCallback(() => {
        setSelectedCourse(null);
    }, []);

    // Hàm được gọi khi một video được tạo/cập nhật/xóa thành công (force refresh VideoList)
    const handleVideoChange = useCallback(() => {
        setVideoUpdateKey(prev => prev + 1); 
    }, []);


    const CourseList = () => {
        if (loadingCourses) {
            return <p className="text-center text-gray-500">Đang tải danh sách khóa học...</p>;
        }

        if (courses.length === 0) {
            return <p className="text-center text-gray-500">Chưa có khóa học nào. Hãy tạo khóa học đầu tiên!</p>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                    <CourseCard 
                        key={course.id}
                        course={course}
                        onManageVideos={handleManageVideos}
                        onEditCourse={handleEditCourse} // PROP MỚI
                        onDeleteCourse={handleDeleteCourse} // PROP MỚI
                        isSelected={selectedCourse?.id === course.id}
                    />
                ))}
            </div>
        );
    };

    const isEditingMode = !!courseToEdit;
    
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
                    
                    {/* KHU VỰC THAO TÁC (Tạo/Chỉnh sửa Khóa học) */}
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={showCourseForm ? () => setShowCourseForm(false) : handleStartCreateCourse}
                            className={`py-2 px-4 text-white rounded-lg shadow-md transition flex items-center ${
                                showCourseForm ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'
                            }`}
                        >
                            {showCourseForm ? (
                                <><X size={20} className="mr-2"/> Đóng Form </>
                            ) : (
                                <><Plus size={20} className="mr-2"/> Tạo Khóa học mới</>
                            )}
                        </button>
                    </div>

                    {/* HIỂN THỊ FORM TẠO/CHỈNH SỬA KHÓA HỌC */}
                    {showCourseForm && (
                        <div className="flex justify-center">
                            <div className="w-full max-w-lg bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-600">
                                <h2 className="text-xl font-semibold mb-4 text-indigo-700">
                                    {isEditingMode ? 'Chỉnh sửa Khóa học' : 'Tạo Khóa học mới'}
                                </h2>
                                <CreateCourseForm 
                                    user={user} 
                                    initialCourse={courseToEdit} // PROP MỚI: Truyền object để kích hoạt chế độ Edit
                                    onCourseSaved={handleCourseSaved} // Đổi tên handler cho cả Create và Update
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* HIỂN THỊ KHU VỰC QUẢN LÝ VIDEO (Tạo + Danh sách) */}
                    {selectedCourse && (
                         <div className="bg-white rounded-xl shadow-2xl border-t-4 border-purple-600 p-6 space-y-8">
                            <h2 className="text-2xl font-bold text-purple-700 border-b pb-3">Quản lý Video cho khóa học: "{selectedCourse.title}"</h2>
                            
                            {/* Form tạo Video (Có thể dùng cho Edit nếu bạn muốn) */}
                            <CreateVideoForm
                                courseId={selectedCourse.id}
                                courseTitle={selectedCourse.title}
                                adminUser={user}
                                onVideoCreated={handleVideoChange} // Kích hoạt cập nhật danh sách
                                onClose={handleCloseVideoForm}
                            />
                            
                            {/* Danh sách Video */}
                            <VideoList 
                                // Key này giúp VideoList tự động fetch lại data khi selectedCourse đổi hoặc có thay đổi video
                                key={selectedCourse.id + videoUpdateKey} 
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
