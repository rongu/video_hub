import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import CreateCourseForm from '../components/Admin/CreateCourseForm'; 
import CreateVideoForm from '../components/Admin/CreateVideoForm'; 
import CourseCard from '../components/Admin/CourseCard'; 
import VideoList from '../components/Admin/VideoList';
import { Plus, X } from 'lucide-react';
// ✅ BỔ SUNG IMPORTS: Session và subscribeToSessions
import { 
    type Course, 
    type Session, // Import Session interface
    subscribeToCourses, 
    deleteCourse,
    subscribeToSessions, // Import hàm lắng nghe Sessions
} from '../services/firebase'; // Đảm bảo đường dẫn này là chính xác

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

// ✅ INTERFACE COURSE ĐÃ BAO GỒM SESSIONS (từ firebase.ts)
interface CourseWithSessions extends Course {
    sessions?: Session[]; 
}

interface AdminDashboardProps {
    user: User;
    onLogout: () => Promise<void>;
    onNavigate: (page: Page, courseId?: string | null) => void; 
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onNavigate }) => {
    // Lưu ý: courses[] vẫn là Course[] gốc (không có sessions) để tối ưu hóa CourseList
    const [courses, setCourses] = useState<Course[]>([]); 
    const [loadingCourses, setLoadingCourses] = useState(true);
    
    // TRẠNG THÁI MỚI: Theo dõi Khóa học đang được chỉnh sửa (nếu null là chế độ tạo mới)
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [showCourseForm, setShowCourseForm] = useState(false); 
    
    // ✅ THAY ĐỔI: selectedCourse bây giờ là CourseWithSessions để chứa Sessions
    const [selectedCourse, setSelectedCourse] = useState<CourseWithSessions | null>(null); 
    
    // Key để force reload VideoList (khi tạo/cập nhật/xóa video)
    const [videoUpdateKey, setVideoUpdateKey] = useState(0); 

    // =================================================================
    // 1. Lắng nghe Real-time danh sách Khóa học (Không kèm Sessions)
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
                        if (updatedCourse) {
                            // Giữ lại sessions cũ trong khi chờ fetch sessions mới (hoặc sessions hiện tại)
                            return { ...updatedCourse, sessions: prevSelectedCourse.sessions || [] }; 
                        }
                        return null; // Khóa học bị xóa
                    }
                    return prevSelectedCourse; 
                });
                
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
        return () => unsubscribe();
    }, []); 

    // =================================================================
    // 2. Lắng nghe Real-time Sessions khi selectedCourse thay đổi
    // =================================================================
    useEffect(() => {
        // Chỉ chạy khi có Khóa học được chọn
        if (!selectedCourse?.id) return;
        
        console.log(`Bắt đầu lắng nghe Sessions cho Course ID: ${selectedCourse.id}`);
        
        const unsubscribeSessions = subscribeToSessions(selectedCourse.id, (fetchedSessions) => {
            console.log(`✅ Đã fetch ${fetchedSessions.length} Sessions cho Course ID: ${selectedCourse.id}`);
            
            // ✅ CẬP NHẬT: Đính kèm danh sách sessions vào state selectedCourse
            setSelectedCourse(prevCourse => {
                if (!prevCourse || prevCourse.id !== selectedCourse.id) return prevCourse;
                
                return {
                    ...prevCourse,
                    sessions: fetchedSessions,
                };
            });
        });

        // Cleanup: Ngừng lắng nghe khi component unmount hoặc selectedCourse thay đổi
        return () => {
            console.log(`Ngừng lắng nghe Sessions cho Course ID: ${selectedCourse.id}`);
            unsubscribeSessions();
        };

    }, [selectedCourse?.id]); // Phụ thuộc vào ID của Khóa học được chọn

    // =================================================================
    // Handlers cho CRUD Khóa học (Giữ nguyên)
    // =================================================================

    const handleStartCreateCourse = useCallback(() => {
        setCourseToEdit(null);
        setSelectedCourse(null);
        setShowCourseForm(true);
    }, []);

    const handleEditCourse = useCallback((course: Course) => {
        setCourseToEdit(course);
        setSelectedCourse(null); 
        setShowCourseForm(true); 
    }, []);

    const handleCourseSaved = useCallback(() => {
        setCourseToEdit(null); 
        setShowCourseForm(false); 
    }, []);
    
    const handleDeleteCourse = useCallback(async (course: Course) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${course.title}" và tất cả video của nó không?`)) {
            try {
                await deleteCourse(course.id);
                console.log(`Đã xóa khóa học có ID: ${course.title}`); 
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
    // Handlers cho Quản lý Video (Điều chỉnh để chấp nhận CourseWithSessions)
    // =================================================================
    
    // ✅ THAY ĐỔI: Chấp nhận CourseWithSessions để gán cho selectedCourse
    const handleManageVideos = useCallback((course: CourseWithSessions) => {
        if (selectedCourse?.id === course.id) {
            setSelectedCourse(null);
        } else {
            // Khi chọn khóa học, gán nó vào state. useEffect (2) sẽ fetch sessions
            setSelectedCourse(course); 
        }
        setShowCourseForm(false); 
        setCourseToEdit(null); 
    }, [selectedCourse]);

    const handleCloseVideoForm = useCallback(() => {
        setSelectedCourse(null);
    }, []);

    const handleVideoChange = useCallback(() => {
        // Force refresh VideoList và kích hoạt re-render để hiển thị số lượng video mới
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
                        // ✅ Đảm bảo CourseCard gọi handleManageVideos với kiểu CourseWithSessions nếu có
                        onManageVideos={handleManageVideos} 
                        onEditCourse={handleEditCourse} 
                        onDeleteCourse={handleDeleteCourse} 
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
                                    initialCourse={courseToEdit} 
                                    onCourseSaved={handleCourseSaved} 
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* HIỂN THỊ KHU VỰC QUẢN LÝ VIDEO VÀ SESSION */}
                    {selectedCourse && (
                         <div className="bg-white rounded-xl shadow-2xl border-t-4 border-purple-600 p-6 space-y-8">
                            <h2 className="text-2xl font-bold text-purple-700 border-b pb-3">Quản lý Video cho khóa học: "{selectedCourse.title}"</h2>
                            <p className="text-sm text-gray-500">
                                Tổng số Video: **{selectedCourse.videoCount}** | Tổng số Chương: **{selectedCourse.sessions?.length || 0}**
                            </p>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Cột 2 & 3: Tạo và Danh sách Video */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Form tạo Video */}
                                    <CreateVideoForm
                                        courseId={selectedCourse.id}
                                        courseTitle={selectedCourse.title}
                                        adminUser={user}
                                        // ✅ TRUYỀN SESSIONS VÀO FORM TẠO VIDEO ĐỂ CHỌN
                                        sessions={selectedCourse.sessions || []} 
                                        onVideoCreated={handleVideoChange}
                                        onClose={handleCloseVideoForm}
                                    />
                                    
                                    {/* Danh sách Video */}
                                    <VideoList 
                                        // Key này giúp VideoList tự động fetch lại data khi selectedCourse đổi hoặc có thay đổi video
                                        key={selectedCourse.id + videoUpdateKey} 
                                        courseId={selectedCourse.id} 
                                        // ✅ TRUYỀN SESSIONS VÀO VIDEOLIST ĐỂ HIỂN THỊ TÊN SESSION
                                        sessions={selectedCourse.sessions || []}
                                        onVideoChanged={handleVideoChange} // Kích hoạt update key nếu có xóa/cập nhật
                                    />
                                </div>
                            </div>
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