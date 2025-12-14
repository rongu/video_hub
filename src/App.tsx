import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore'; 
import { Loader2 } from 'lucide-react'; 

// Imports các services cần thiết cho Video Hub
import { 
    initializeAndAuthenticate, 
    getFirebaseAuth, 
    getFirestoreDb, 
    handleSignOut, 
    getAppUsersCollectionRef,
    type AppUser 
} from './services/firebase'; 

// Imports các trang giao diện 
import LandingPage from './pages/LandingPage.tsx'; 
import LoginPage from './pages/LoginPage.tsx'; 
import RegisterPage from './pages/RegisterPage.tsx'; 
import HomePage from './pages/HomePage.tsx'; 
import AdminDashboard from './pages/AdminDashboard.tsx'; 
import CourseDetailPage from './pages/CourseDetailPage.tsx'; 

// =================================================================
// ĐỊNH NGHĨA TYPES & HÀM TIỆN ÍCH CHO ROUTING
// =================================================================

type PageType = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 
type UserRole = 'student' | 'admin' | null; 
type Page = PageType; 
type NavigateFunction = (page: Page, courseId?: string | null) => void;

/**
 * Phân tích URL hiện tại và chuyển đổi thành Page/CourseId
 */
const parseUrl = (pathname: string): { page: Page, courseId: string | null } => {
    // Luôn đảm bảo pathname bắt đầu bằng '/'
    const path = pathname.toLowerCase().replace(/\/$/, ''); 
    
    // Kiểm tra trang chi tiết khóa học: /detail/{courseId}
    const detailMatch = path.match(/\/detail\/([a-zA-Z0-9_-]+)/);
    if (detailMatch) {
        return { page: 'detail', courseId: detailMatch[1] };
    }
    
    // Kiểm tra các trang chính
    if (path === '/home') return { page: 'home', courseId: null };
    if (path === '/admin') return { page: 'admin', courseId: null };
    if (path === '/login') return { page: 'login', courseId: null };
    if (path === '/register') return { page: 'register', courseId: null };

    // Mặc định: Landing page
    return { page: 'landing', courseId: null };
};

// Component chính của ứng dụng
const App: React.FC = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null); 
    
    // Khởi tạo state điều hướng dựa trên URL hiện tại
    const initialRoute = parseUrl(window.location.pathname);
    const [currentPage, setCurrentPage] = useState<Page>(initialRoute.page);
    const [currentCourseId, setCurrentCourseId] = useState<string | null>(initialRoute.courseId);

    const [dbInstance, setDbInstance] = useState<Firestore | null>(null);

    // =================================================================
    // HOOK 1: Khởi tạo Firebase và Lắng nghe trạng thái Auth
    // =================================================================

    useEffect(() => {
        // 1. Khởi tạo Firebase
        initializeAndAuthenticate().then(() => {
            const auth = getFirebaseAuth();
            setDbInstance(getFirestoreDb()); 

            // 2. Lắng nghe trạng thái Auth
            const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
                setUser(currentUser);
                setRole(null); 
                setIsAuthReady(true);
                
                if (!currentUser) {
                    // Nếu đăng xuất, luôn đẩy về landing page trong URL
                    onNavigate('landing'); 
                }
            });

            // Cleanup Auth Listener
            return () => unsubscribeAuth();
        });
        
        // 3. Lắng nghe sự kiện Popstate (Back/Forward)
        const handlePopState = () => {
            const newRoute = parseUrl(window.location.pathname);
            setCurrentPage(newRoute.page);
            setCurrentCourseId(newRoute.courseId);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []); // Chỉ chạy một lần khi mount

    // =================================================================
    // HOOK 2: Lắng nghe Role từ Firestore & Điều hướng ban đầu
    // =================================================================

    useEffect(() => {
        if (!user || !dbInstance) {
            setRole(null);
            return;
        }

        const usersCollectionRef = getAppUsersCollectionRef();
        const userRoleDocRef = doc(usersCollectionRef, user.uid); 

        const unsubscribeRole = onSnapshot(userRoleDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as AppUser; 
                const userRole = data.role as UserRole; 
                setRole(userRole);
                
                // Sau khi Role được xác định, đảm bảo URL khớp với vai trò
                const currentRoute = parseUrl(window.location.pathname);
                
                if (userRole === 'admin') {
                    // Nếu đang ở trang không phải admin/home/detail, chuyển về admin
                    if (currentRoute.page !== 'admin' && currentRoute.page !== 'home' && currentRoute.page !== 'detail') {
                        onNavigate('admin');
                    }
                } else if (userRole === 'student') { 
                    // Nếu đang ở trang admin, chuyển về home
                    if (currentRoute.page === 'admin') {
                        onNavigate('home');
                    }
                }
                
                // Cập nhật lại state trang (để đảm bảo đồng bộ với URL)
                setCurrentPage(currentRoute.page);
                setCurrentCourseId(currentRoute.courseId);
                
            } else {
                console.warn(`Profile for user ${user.uid} not found. Defaulting to student role.`);
                setRole('student');
                // Nếu không có profile, chuyển về Home
                onNavigate('home');
            }
        }, (error) => {
            console.error("Lỗi khi lắng nghe Role/Profile:", error);
            setRole('student'); 
            onNavigate('home');
        });

        return () => unsubscribeRole();
    }, [user, dbInstance]); // Chạy lại khi user HOẶC dbInstance thay đổi

    // =================================================================
    // HÀM ĐIỀU HƯỚNG CHÍNH (Cập nhật History API)
    // =================================================================

    const onNavigate: NavigateFunction = useCallback((page, courseId = null) => {
        let path = '';
        let title = 'Video Hub';

        // 1. Tạo đường dẫn URL
        if (page === 'landing') {
            path = '/';
            title = 'Video Hub | Chào mừng';
        } else if (page === 'login') {
            path = '/login';
            title = 'Video Hub | Đăng nhập';
        } else if (page === 'register') {
            path = '/register';
            title = 'Video Hub | Đăng ký';
        } else if (page === 'home') {
            path = '/home';
            title = 'Video Hub | Trang chủ';
        } else if (page === 'admin') {
            // Kiểm tra quyền (chỉ admin mới được vào admin path)
            if (role !== 'admin') {
                console.warn("Truy cập Admin bị từ chối.");
                path = '/home';
                title = 'Video Hub | Trang chủ';
            } else {
                path = '/admin';
                title = 'Video Hub | Quản trị';
            }
        } else if (page === 'detail' && courseId) {
            path = `/detail/${courseId}`;
            title = 'Video Hub | Chi tiết Khóa học';
        } else {
            path = '/'; 
            title = 'Video Hub | Chào mừng';
        }

        // 2. Cập nhật History API (Làm cho nút Back/Forward hoạt động)
        // Sử dụng replaceState nếu trang hiện tại là landing/login/register, tránh spam history
        const historyAction = (window.location.pathname === path || window.location.pathname === '/') 
                              ? 'replaceState' : 'pushState';

        window.history[historyAction]({}, title, path);

        // 3. Cập nhật state nội bộ (Component sẽ re-render)
        setCurrentPage(page);
        setCurrentCourseId(courseId);
        
    }, [role]); 

    // =================================================================
    // RENDER CONTENT (Giữ nguyên logic điều kiện)
    // =================================================================

    const handleLogout = useCallback(async () => {
        await handleSignOut();
        onNavigate('landing'); // Chuyển hướng bằng navigator mới
        setCurrentCourseId(null);
    }, [onNavigate]);

    const renderContent = () => {
        // Chờ Auth và DB Instance sẵn sàng
        if (!isAuthReady || !dbInstance) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mr-3" />
                    <p className="text-xl text-indigo-600">Đang tải ứng dụng...</p>
                </div>
            );
        }

        // 1. LOGGED IN 
        if (user) {
            
            // 1a. Đang chờ Role từ Firestore
            if (!role) {
                return (
                    <div className="flex items-center justify-center min-h-screen bg-gray-50">
                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mr-3" />
                        <p className="text-xl text-indigo-600">Đang xác định vai trò...</p>
                    </div>
                );
            }

            let ComponentToRender: React.ReactElement; 

            // Logic điều hướng dựa trên currentPage và role (đã đồng bộ với URL)
            if (role === 'admin' && currentPage === 'admin') {
                ComponentToRender = (
                    <AdminDashboard 
                        onLogout={handleLogout} 
                        user={user} 
                        onNavigate={onNavigate} 
                    />
                );
            } else if (currentPage === 'detail' && currentCourseId) {
                ComponentToRender = (
                    <CourseDetailPage 
                        courseId={currentCourseId}
                        onNavigate={onNavigate}
                    />
                );
            } else {
                // Trang Home cho Student, hoặc default cho Admin
                ComponentToRender = (
                    <HomePage 
                        onLogout={handleLogout} 
                        user={user} 
                        onNavigate={onNavigate} 
                        role={role}
                    />
                );
            }
            
            return ComponentToRender;
        }

        // 2. GUEST (Chưa đăng nhập - user === null)
        let ComponentToRender: React.ReactElement; 

        switch (currentPage) {
            case 'login':
                ComponentToRender = <LoginPage onNavigate={onNavigate} />;
                break;
            case 'register':
                ComponentToRender = <RegisterPage onNavigate={onNavigate} />;
                break;
            case 'landing':
            default:
                ComponentToRender = (
                    <LandingPage 
                        onNavigate={onNavigate} 
                        user={null} 
                        onLogout={handleLogout} 
                    />
                );
                break;
        }

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 font-sans">
                {ComponentToRender}
            </div>
        );
    };

    return renderContent();
};

export default App;