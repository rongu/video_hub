import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import CreateCourseForm from '../components/Admin/CreateCourseForm'; 
import CreateVideoForm from '../components/Admin/CreateVideoForm'; 
import CourseCard from '../components/Admin/CourseCard'; 
import VideoList from '../components/Admin/VideoList';
import UserManagementPage from '../components/Admin/UserManagementPage'; 
import { Plus, X, BookOpen, Users } from 'lucide-react'; 
import { 
    type Course, 
    type Session, 
    type Video, // Thêm Video type
    subscribeToCourses, 
    deleteCourse,
    subscribeToSessions, // Đã fix index trong firebase.ts
    subscribeToVideos, // Lắng nghe videos cho khóa học đang chọn
} from '../services/firebase'; 

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

// Cấu trúc Course mở rộng để chứa Sessions và Videos
interface CourseWithSessions extends Course {
    sessions?: Session[]; 
    videos?: Video[]; // Thêm Videos để dễ dàng lọc
}

// Định nghĩa lại props cho CreateVideoForm
interface CreateVideoFormProps {
    courseId: string;
    courseTitle: string;
    adminUser: User;
    onVideoCreated: () => void;
    onClose: () => void;
    sessions: Session[]; 
}
const TypedCreateVideoForm = CreateVideoForm as React.FC<CreateVideoFormProps>;


interface AdminDashboardProps {
    user: User;
    onLogout: () => Promise<void>;
    onNavigate: (page: Page, courseId?: string | null) => void; 
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onNavigate }) => {
    const [courses, setCourses] = useState<Course[]>([]); 
    const [loadingCourses, setLoadingCourses] = useState(true);
    
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [showCourseForm, setShowCourseForm] = useState(false); 
    
    const [selectedCourse, setSelectedCourse] = useState<CourseWithSessions | null>(null); 
    
    const [videoUpdateKey, setVideoUpdateKey] = useState(0); 
    const [currentAdminView, setCurrentAdminView] = useState<'courses' | 'users'>('courses');


    // =================================================================
    // 1. Lắng nghe Real-time danh sách Khóa học (Giữ nguyên)
    // =================================================================
    useEffect(() => {
        setLoadingCourses(true);
        let unsubscribe = () => {};
        
        try {
            unsubscribe = subscribeToCourses((fetchedCourses) => {
                setCourses(fetchedCourses);
                setLoadingCourses(false);

                // Cập nhật selectedCourse an toàn
                setSelectedCourse(prevSelectedCourse => {
                    if (prevSelectedCourse) {
                        const updatedCourse = fetchedCourses.find(c => c.id === prevSelectedCourse.id);
                        if (updatedCourse) {
                            // Giữ lại sessions/videos cũ
                            return { ...updatedCourse, sessions: prevSelectedCourse.sessions || [], videos: prevSelectedCourse.videos || [] }; 
                        }
                        return null; 
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
    // 2. Lắng nghe Sessions & Videos cho Khóa học đang chọn
    // =================================================================
    useEffect(() => {
        if (!selectedCourse?.id || currentAdminView !== 'courses') return;
        
        const courseId = selectedCourse.id;
        
        // 2a. Lắng nghe Sessions
        const unsubscribeSessions = subscribeToSessions(courseId, (fetchedSessions: Session[]) => {
            console.log(`✅ Fetched ${fetchedSessions.length} Sessions`);
            setSelectedCourse(prevCourse => {
                if (!prevCourse || prevCourse.id !== courseId) return prevCourse;
                return { ...prevCourse, sessions: fetchedSessions };
            });
        });

        // 2b. Lắng nghe Videos
        // Lấy TẤT CẢ Videos cho khóa học này (sessionId = null)
        const unsubscribeVideos = subscribeToVideos(courseId, null, (fetchedVideos: Video[]) => {
            console.log(`✅ Fetched ${fetchedVideos.length} Videos`);
            setSelectedCourse(prevCourse => {
                if (!prevCourse || prevCourse.id !== courseId) return prevCourse;
                return { ...prevCourse, videos: fetchedVideos };
            });
        });


        // Cleanup Sessions and Videos
        return () => {
            unsubscribeSessions();
            unsubscribeVideos();
        };

    }, [selectedCourse?.id, currentAdminView]);


    // =================================================================
    // Handlers (Giữ nguyên)
    // =================================================================

    const handleStartCreateCourse = useCallback(() => {
        setCourseToEdit(null);
        setSelectedCourse(null);
        setCurrentAdminView('courses'); 
        setShowCourseForm(true);
    }, []);

    const handleEditCourse = useCallback((course: Course) => {
        setCourseToEdit(course);
        setSelectedCourse(null); 
        setCurrentAdminView('courses'); 
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
                if (selectedCourse?.id === course.id) {
                    setSelectedCourse(null);
                }
            } catch (error) {
                console.error("Lỗi khi xóa khóa học:", error);
                alert("Không thể xóa khóa học. Vui lòng thử lại.");
            }
        }
    }, [selectedCourse]);


    const handleManageVideos = useCallback((course: CourseWithSessions) => {
        if (selectedCourse?.id === course.id && currentAdminView === 'courses') {
            setSelectedCourse(null);
        } else {
            // Khi chọn, set Course. UseEffect sẽ tự fetch Sessions/Videos
            setSelectedCourse(course); 
            setCurrentAdminView('courses'); 
        }
        setShowCourseForm(false); 
        setCourseToEdit(null); 
    }, [selectedCourse, currentAdminView]);

    const handleCloseVideoForm = useCallback(() => {
        setSelectedCourse(null);
    }, []);

    const handleVideoChange = useCallback(() => {
        setVideoUpdateKey(prev => prev + 1); 
    }, []);

    const handleSwitchView = useCallback((view: 'courses' | 'users') => {
        setCurrentAdminView(view);
        setSelectedCourse(null);
        setCourseToEdit(null);
        setShowCourseForm(false);
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
                        onEditCourse={handleEditCourse} 
                        onDeleteCourse={handleDeleteCourse} 
                        isSelected={selectedCourse?.id === course.id && currentAdminView === 'courses'} 
                    />
                ))}
            </div>
        );
    };

    const isEditingMode = !!courseToEdit;
    
    return (
        <div className="min-h-screen w-full bg-indigo-50 flex flex-col font-sans">
            {/* Header (Giữ nguyên) */}
            <header className="bg-indigo-700 shadow-lg p-4 flex justify-between items-center w-full">
                <h1 className="text-2xl font-bold text-white">Quản trị Hệ thống (Admin)</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-indigo-200 font-medium hidden sm:inline">Quản trị viên: {user.displayName || user.email}</span>
                    <button
                        onClick={() => onNavigate('home')} // ✅ FIX: Thêm nút chuyển về HOME
                        className="py-1 px-3 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition duration-200"
                    >
                        Trang chủ
                    </button>
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
                    
                    {/* VIEW TABS */}
                    <div className="flex space-x-4 border-b border-gray-300 pb-2">
                        <button 
                            onClick={() => handleSwitchView('courses')}
                            className={`flex items-center px-4 py-2 text-lg font-semibold rounded-t-lg transition ${
                                currentAdminView === 'courses' ? 'text-indigo-700 border-b-4 border-indigo-700 bg-white shadow-t' : 'text-gray-500 hover:text-indigo-500'
                            }`}
                        >
                            <BookOpen className="w-5 h-5 mr-2"/> Quản lý Khóa học
                        </button>
                        <button 
                            onClick={() => handleSwitchView('users')}
                            className={`flex items-center px-4 py-2 text-lg font-semibold rounded-t-lg transition ${
                                currentAdminView === 'users' ? 'text-indigo-700 border-b-4 border-indigo-700 bg-white shadow-t' : 'text-gray-500 hover:text-indigo-500'
                            }`}
                        >
                            <Users className="w-5 h-5 mr-2"/> Quản lý User & Ghi danh
                        </button>
                    </div>

                    {/* ======================================================= */}
                    {/* KHU VỰC 1: QUẢN LÝ USER */}
                    {/* ======================================================= */}
                    {currentAdminView === 'users' && (
                        <UserManagementPage />
                    )}

                    {/* ======================================================= */}
                    {/* KHU VỰC 2: QUẢN LÝ KHÓA HỌC & VIDEO */}
                    {/* ======================================================= */}
                    {currentAdminView === 'courses' && (
                        <>
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
                            
                            {/* HIỂN THỊ KHU VỰC QUẢN LÝ VIDEO */}
                            {selectedCourse && (
                                <div className="bg-white rounded-xl shadow-2xl border-t-4 border-purple-600 p-6 space-y-8">
                                    <h2 className="text-2xl font-bold text-purple-700 border-b pb-3">Quản lý Video cho khóa học: "{selectedCourse.title}"</h2>
                                    <p className="text-sm text-gray-500">
                                        Tổng số Video: **{selectedCourse.videoCount}** | Tổng số Chương: **{selectedCourse.sessions?.length || 0}**
                                    </p>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        
                                        {/* Cột 1: Quản lý Sessions (Sử dụng CreateVideoForm như một cổng) */}
                                        <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <h3 className="text-lg font-semibold mb-3 border-b pb-2 text-indigo-700">Quản lý Session (Tạo/Sửa/Chọn)</h3>
                                            <TypedCreateVideoForm
                                                courseId={selectedCourse.id}
                                                courseTitle={selectedCourse.title}
                                                adminUser={user}
                                                sessions={selectedCourse.sessions || []} 
                                                onVideoCreated={handleVideoChange}
                                                onClose={handleCloseVideoForm}
                                            />
                                        </div>

                                        {/* Cột 2 & 3: Danh sách Video */}
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* Danh sách Video */}
                                            {/* TRUYỀN PROPS ĐẦY ĐỦ CHO VIDEOLIST */}
                                            <VideoList 
                                                key={selectedCourse.id + videoUpdateKey} 
                                                courseId={selectedCourse.id} 
                                                sessions={selectedCourse.sessions || []}
                                                videos={selectedCourse.videos || []} // ✅ TRUYỀN VIDEOS
                                                onVideoChanged={handleVideoChange} 
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
                        </>
                    )}
                </div>
            </main>
            <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <p>© 2025 VideoHub. Học tập để vươn xa.</p>
            </footer>
        </div>
    );
};

export default AdminDashboard;