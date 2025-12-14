import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
// Import type Firestore để sử dụng trong state
import { doc, onSnapshot, type Firestore } from 'firebase/firestore'; 
// ✅ FIX: Thêm Loader2 vào import
import { Loader2 } from 'lucide-react'; 

// Imports các services cần thiết cho Video Hub
import { 
    initializeAndAuthenticate, 
    getFirebaseAuth, 
    getFirestoreDb, // Chỉ dùng để lấy instance SAU KHI khởi tạo
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
// ĐỊNH NGHĨA TYPES (CHUẨN HÓA)
// =================================================================

type PageType = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 
type UserRole = 'student' | 'admin' | null; 
type Page = PageType; 
type NavigateFunction = (page: Page, courseId?: string | null) => void;

// Component chính của ứng dụng
const App: React.FC = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null); 
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

    // ✅ MỚI: State để lưu trữ instance Firestore, bắt đầu bằng null
    const [dbInstance, setDbInstance] = useState<Firestore | null>(null);


    // =================================================================
    // HOOK 1: Khởi tạo Firebase và Lắng nghe trạng thái Auth
    // =================================================================

    useEffect(() => {
        // 1. Khởi tạo Firebase
        initializeAndAuthenticate().then(() => {
            const auth = getFirebaseAuth();
            // Gán instance DB sau khi khởi tạo thành công
            setDbInstance(getFirestoreDb()); // DB đã sẵn sàng!

            // 2. Lắng nghe trạng thái Auth
            const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
                setUser(currentUser);
                setRole(null); 
                setIsAuthReady(true);
                
                if (!currentUser) {
                    setCurrentPage('landing');
                }
            });

            // Cleanup Auth Listener
            return () => unsubscribeAuth();
        });
    }, []);

    // =================================================================
    // HOOK 2: Lắng nghe Role từ Firestore (Phụ thuộc vào dbInstance)
    // =================================================================

    useEffect(() => {
        // ✅ THAY ĐỔI: Chỉ chạy khi User đăng nhập VÀ DB đã sẵn sàng
        if (!user || !dbInstance) {
            setRole(null);
            return;
        }

        const usersCollectionRef = getAppUsersCollectionRef();
        const userRoleDocRef = doc(usersCollectionRef, user.uid); 

        // Lắng nghe thay đổi Role/Profile của user
        const unsubscribeRole = onSnapshot(userRoleDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as AppUser; 
                const userRole = data.role as UserRole; 
                setRole(userRole);
                
                if (userRole === 'admin') {
                    setCurrentPage('admin');
                } else if (userRole === 'student') { 
                    setCurrentPage('home');
                }
            } else {
                console.warn(`Profile for user ${user.uid} not found. Defaulting to student role.`);
                setRole('student');
                setCurrentPage('home'); 
            }
        }, (error) => {
            console.error("Lỗi khi lắng nghe Role/Profile:", error);
            setRole('student'); 
            setCurrentPage('home'); 
        });

        // Cleanup Role Listener
        return () => unsubscribeRole();
    }, [user, dbInstance]); // Chạy lại khi user HOẶC dbInstance thay đổi

    // =================================================================
    // HANDLERS (Giữ nguyên)
    // =================================================================

    const handleLogout = useCallback(async () => {
        await handleSignOut();
        setCurrentPage('landing');
        setCurrentCourseId(null);
    }, []);

    const onNavigate: NavigateFunction = useCallback((page, courseId = null) => {
        if (page === 'admin' && role !== 'admin') {
            console.warn("Truy cập bị từ chối: Không phải Admin.");
            return;
        }
        
        setCurrentPage(page);
        setCurrentCourseId(courseId);
    }, [role]); 

    // =================================================================
    // RENDER CONTENT
    // =================================================================

    const renderContent = () => {
        // ✅ THAY ĐỔI: Chờ cả Auth và DB Instance sẵn sàng
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

            // 1b. Đã có Role
            let ComponentToRender: React.ReactElement; 

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