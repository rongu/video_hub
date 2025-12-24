import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import { LogOut, Loader2, BookOpen, Home, BarChart3 } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { 
    type Course, 
    type Enrollment, 
    subscribeToUserEnrollments, 
    getCourseDocRef,
    subscribeToAllUserProgress
} from '../services/firebase'; // Sửa lỗi resolution bằng cách bỏ /index
import CourseListItem from '../components/User/CourseListItem'; // Sửa lỗi resolution bằng cách bỏ .tsx

type Page = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 
type UserRole = 'student' | 'admin' | null; 

interface HomePageProps {
    user: User; 
    onLogout: () => Promise<void>;
    onNavigate: (page: Page, courseId?: string | null) => void;
    role: UserRole; 
}

const HomePage: React.FC<HomePageProps> = ({ user, onLogout, onNavigate, role }) => {
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]); 
    const [progressMap, setProgressMap] = useState<{[courseId: string]: number}>({}); // Lưu số video đã hoàn thành
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = role === 'admin';

    useEffect(() => {
        if (!user) return;

        // 1. Lắng nghe tiến độ học tập (All courses)
        const unsubscribeProgress = subscribeToAllUserProgress(user.uid, (map) => {
            setProgressMap(map);
        });

        // 2. Lắng nghe danh sách ghi danh
        const userId = user.uid;
        let courseUnsubscribes: (() => void)[] = []; 

        const unsubscribeEnrollment = subscribeToUserEnrollments(userId, (enrollments: Enrollment[]) => {
            courseUnsubscribes.forEach(unsub => unsub());
            courseUnsubscribes = [];

            if (enrollments.length === 0) {
                setEnrolledCourses([]);
                setLoading(false);
                return;
            }

            const courseIds = enrollments.map(e => e.courseId);
            const coursesMap = new Map<string, Course>(); 
            let loadedCount = 0;
            
            courseIds.forEach(courseId => {
                const unsubscribeCourse = onSnapshot(getCourseDocRef(courseId), (docSnap) => {
                    loadedCount++;
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        coursesMap.set(docSnap.id, {
                            id: docSnap.id,
                            ...data,
                            createdAt: data.createdAt?.toMillis() || Date.now(),
                            updatedAt: data.updatedAt?.toMillis() || Date.now(),
                        } as Course);
                    }
                    
                    if (loadedCount >= courseIds.length) {
                        setEnrolledCourses(Array.from(coursesMap.values()));
                        setLoading(false);
                    }
                });
                courseUnsubscribes.push(unsubscribeCourse);
            });
        });

        return () => {
            unsubscribeProgress();
            unsubscribeEnrollment();
            courseUnsubscribes.forEach(unsub => unsub());
        };
    }, [user]);

    return (
        <div className="min-h-screen w-full bg-gray-50 flex flex-col font-sans">
            <header className="bg-white shadow-md p-4 flex justify-between items-center w-full sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-indigo-700 flex items-center">
                    <Home className="h-6 w-6 mr-2"/> Home Hub
                </h1>
                <div className="flex items-center space-x-3">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-sm font-bold text-gray-800">{user?.displayName}</span>
                        <span className="text-[10px] uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black">{role}</span>
                    </div>

                    {isAdmin && (
                        <button onClick={() => onNavigate('admin')} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600 transition shadow-sm">
                            <BarChart3 className="h-4 w-4 mr-2"/> Admin Panel
                        </button>
                    )}

                    <button onClick={onLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition">
                        <LogOut className="h-6 w-6"/>
                    </button>
                </div>
            </header>

            <main className="flex-grow p-4 sm:p-8 max-w-7xl mx-auto w-full">
                <div className="mb-8">
                    <h2 className="text-4xl font-black text-gray-900 mb-2">Khóa học của bạn</h2>
                    <p className="text-gray-500">Tiếp tục hành trình chinh phục kiến thức ngay hôm nay.</p>
                </div>
                
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-indigo-500">
                        <Loader2 className="h-12 w-12 animate-spin mb-4" />
                        <p className="font-medium">Đang tải danh sách bài học...</p>
                    </div>
                ) : enrolledCourses.length === 0 ? (
                    <div className="bg-white p-10 rounded-3xl shadow-sm border border-dashed border-gray-300 text-center">
                        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-xl font-bold text-gray-600">Bạn chưa có khóa học nào</p>
                        <p className="text-gray-400">Vui lòng liên hệ Admin để được cấp quyền truy cập.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {enrolledCourses.map(course => {
                            // Tính toán % cho từng card
                            const completedCount = progressMap[course.id] || 0;
                            const percent = course.videoCount > 0 
                                ? Math.min(Math.round((completedCount / course.videoCount) * 100), 100) 
                                : 0;

                            return (
                                <div key={course.id} className="group relative">
                                    <CourseListItem 
                                        course={course}
                                        isEnrolled={true} 
                                        onViewCourse={() => onNavigate('detail', course.id)}
                                    />
                                    {/* Thanh Progress Bar hiển thị trên thẻ khóa học */}
                                    <div className="absolute bottom-4 left-6 right-6 z-10">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                {percent}% HOÀN THÀNH
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200/50 rounded-full h-1.5 backdrop-blur-sm overflow-hidden">
                                            <div 
                                                className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default HomePage;