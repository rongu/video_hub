import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import { LogOut, Loader2, BookOpen, Home } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore'; // Cần import onSnapshot từ firebase/firestore
import { 
    type Course, 
    type Enrollment, // Import Enrollment type
    subscribeToUserEnrollments, // Hàm mới: Lắng nghe bản ghi ghi danh
    getCourseDocRef, // Hàm lấy tham chiếu Course Doc
} from '../services/firebase.ts';
import CourseListItem from '../components/User/CourseListItem.tsx';

// Định nghĩa lại Page type để sử dụng trong component này
type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 

interface HomePageProps {
    user: User; 
    onLogout: () => Promise<void>;
    onNavigate: (page: Page, courseId?: string | null) => void;
    // ✅ FIX LỖI TYPE: Sửa 'user' thành 'student' để khớp với firebase.ts và App.tsx
    role: 'student' | 'admin' | null; 
}

/**
 * Trang chủ hiển thị các khóa học mà người dùng hiện tại đã ghi danh (enrolled).
 */
const HomePage: React.FC<HomePageProps> = ({ user, onLogout, onNavigate, role }) => {
    // Đổi tên state từ 'courses' thành 'enrolledCourses' cho rõ ràng
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Lắng nghe Real-time danh sách Khóa học đã ghi danh
    useEffect(() => {
        if (!user) {
            setError("Lỗi: Người dùng chưa đăng nhập.");
            setLoading(false);
            return;
        }

        setLoading(true);
        const userId = user.uid;
        // Mảng để lưu trữ các hàm hủy đăng ký (unsubscribe functions) cho từng Course Doc
        let courseUnsubscribes: (() => void)[] = []; 

        // --- 1. Lắng nghe các bản ghi ghi danh (Enrollments) ---
        const unsubscribeEnrollment = subscribeToUserEnrollments(userId, (enrollments: Enrollment[]) => {
            // Hủy các listener Course cũ trước khi thêm các listener mới
            courseUnsubscribes.forEach(unsub => unsub());
            courseUnsubscribes = []; // Đặt lại mảng unsubscribes

            if (enrollments.length === 0) {
                setEnrolledCourses([]);
                setLoading(false);
                return;
            }

            const courseIds = enrollments.map(e => e.courseId);
            const coursesMap = new Map<string, Course>(); // Dùng Map để quản lý và cập nhật khóa học

            let loadedCount = 0;
            
            // --- 2. Lắng nghe chi tiết từng khóa học ---
            courseIds.forEach(courseId => {
                const courseDocRef = getCourseDocRef(courseId);
                
                // Lắng nghe real-time chi tiết của từng khóa học
                const unsubscribeCourse = onSnapshot(courseDocRef, (docSnap) => {
                    loadedCount++;
                    
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // NOTE: Timestamp to Date conversion (Tùy thuộc vào firebase.ts)
                        const course: Course = {
                            id: docSnap.id,
                            title: data.title as string,
                            description: data.description as string,
                            videoCount: data.videoCount as number || 0,
                            adminId: data.adminId as string,
                            // Chú ý: Timestamp to Date conversion có thể gây lỗi nếu không đồng bộ
                            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(), 
                        };
                        
                        coursesMap.set(course.id, course);
                    } else {
                        // Xóa khóa học nếu nó không còn tồn tại
                        coursesMap.delete(courseId);
                    }
                    
                    // Chỉ cập nhật state và dừng loading khi tất cả course đã được check lần đầu
                    if (loadedCount >= courseIds.length) {
                        setEnrolledCourses(Array.from(coursesMap.values()));
                        setLoading(false);
                        setError(null);
                    }
                }, (courseErr) => {
                    console.error(`Lỗi lắng nghe Course ID ${courseId}:`, courseErr);
                    // Bỏ qua lỗi 1 khóa học, tiếp tục với các khóa học khác
                    loadedCount++;
                    if (loadedCount >= courseIds.length) {
                         setLoading(false);
                    }
                });
                courseUnsubscribes.push(unsubscribeCourse);
            });

            // Nếu không có khóa học nào được ghi danh (sau khi hủy listener cũ)
            if (courseIds.length === 0) {
                setLoading(false);
            }
        });

        // Cleanup: Hủy đăng ký Enrollment listener và tất cả Course Doc listeners
        return () => {
            unsubscribeEnrollment();
            courseUnsubscribes.forEach(unsub => unsub());
        };
        
    }, [user]); 

    // Xử lý khi User nhấp vào Khóa học: Chuyển đến Trang Chi tiết
    const handleViewCourse = useCallback((course: Course) => {
        // Chuyển sang trạng thái 'detail' và truyền ID khóa học
        onNavigate('detail', course.id); 
    }, [onNavigate]);

    return (
        <div className="min-h-screen w-full bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white shadow-md p-4 flex justify-between items-center w-full sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-indigo-700 flex items-center">
                    <Home className="h-6 w-6 mr-2"/> Home Hub
                </h1>
                <div className="flex items-center space-x-3">
                    <span className="text-gray-600 font-medium hidden sm:inline">
                        Chào mừng, {user?.displayName || user?.email?.split('@')[0]} 
                        {/* HIỂN THỊ ROLE */}
                        {role && <span className={`text-xs font-bold ml-2 px-2 py-0.5 rounded-full ${role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {role.toUpperCase()}
                        </span>}
                    </span>
                    
                    {/* Nút Admin (Chỉ hiển thị cho Admin) */}
                    {role === 'admin' && (
                        <button 
                            onClick={() => onNavigate('admin')}
                            className="flex items-center bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-green-600 transition"
                        >
                            <BookOpen className="h-4 w-4 mr-1"/> Admin Panel
                        </button>
                    )}

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
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-indigo-300 pb-2 text-center sm:text-left flex items-center">
                    <BookOpen className='w-7 h-7 mr-2 text-indigo-600'/> Các Khóa học đã ghi danh
                </h2>
                
                {loading && (
                    <div className="flex justify-center items-center h-48 bg-white rounded-xl shadow-md mt-6">
                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mr-3" />
                        <span className="text-lg text-gray-600">Đang tải danh sách khóa học đã ghi danh...</span>
                    </div>
                )}
                
                {!loading && enrolledCourses.length === 0 && !error && (
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 p-6 rounded-lg shadow-md mt-6" role="alert">
                        <p className="font-bold text-xl">Chưa có Khóa học nào</p>
                        <p className="mt-2">Bạn chưa được ghi danh vào bất kỳ khóa học nào. Vui lòng liên hệ quản trị viên.</p>
                        {role === 'admin' && (
                            <p className="mt-3 text-sm text-indigo-600">Với vai trò Admin, bạn có thể tạo khóa học mới trong Admin Panel.</p>
                        )}
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md mt-6" role="alert">
                        <p className="font-bold">Lỗi!</p>
                        <p>{error}</p>
                    </div>
                )}


                {/* Danh sách Khóa học đã ghi danh */}
                {!loading && enrolledCourses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrolledCourses.map(course => (
                            <CourseListItem 
                                key={course.id} 
                                course={course}
                                isEnrolled={true} 
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