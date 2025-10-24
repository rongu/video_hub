import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

// Imports các services cần thiết cho Video Hub
import { 
    initializeAndAuthenticate, 
    getFirebaseAuth, 
    getFirestoreDb, 
    handleSignOut, 
    getUserDocumentPath,
} from './services/firebase.ts'; 

// Imports các trang giao diện 
import LandingPage from './pages/LandingPage.tsx'; 
import LoginPage from './pages/LoginPage.tsx'; 
import RegisterPage from './pages/RegisterPage.tsx'; 
import HomePage from './pages/HomePage.tsx'; 
import AdminDashboard from './pages/AdminDashboard.tsx'; 
import CourseDetailPage from './pages/CourseDetailPage.tsx'; 

// =================================================================
// ĐỊNH NGHĨA TYPES (Đã sửa để khớp với yêu cầu của user)
// =================================================================

// Kiểu trang chính xác
type PageType = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 
type UserRole = 'user' | 'admin' | 'guest';

// TẠO ALIAS 'Page' để khớp với tham số 'page' trong interfaces của user
type Page = PageType; 

// Định nghĩa chung cho hàm điều hướng (KHỚP với user: page: Page, courseId?: string | null)
type NavigateFunction = (page: Page, courseId?: string | null) => void;

// Component chính của ứng dụng
const App: React.FC = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState<PageType>('landing');
    const [role, setRole] = useState<UserRole>('guest'); 
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null); 

    // =================================================================
    // 1. AUTHENTICATION & INITIALIZATION 
    // =================================================================
    useEffect(() => {
        let authUnsubscribe: (() => void) | undefined;
        
        const setupAuthListener = async () => {
            await initializeAndAuthenticate(); 

            try {
                const auth = getFirebaseAuth(); 
                
                authUnsubscribe = auth.onAuthStateChanged((currentUser) => {
                    setUser(currentUser);
                    if (!currentUser) {
                        setRole('guest');
                        setSelectedCourseId(null); 
                        setCurrentPage('landing'); 
                    }
                    setIsAuthReady(true);
                });
            
            } catch (e) {
                console.error("Không thể thiết lập Auth Listener.", e);
                setIsAuthReady(true); 
            }
        };

        setupAuthListener();
        
        return () => {
            if (authUnsubscribe) {
                authUnsubscribe();
            }
        };

    }, []);

    // =================================================================
    // 2. ROLE ROUTING & CLEANUP 
    // =================================================================
    useEffect(() => {
        if (!user) {
            return; 
        }

        let unsubscribeRole: () => void;
        
        try {
            const db = getFirestoreDb();
            const userDocRef = getUserDocumentPath(user.uid);
            
            unsubscribeRole = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const userRole = userData.role as UserRole || 'user';
                    setRole(userRole);
                    
                    if (userRole === 'admin' && currentPage !== 'admin') {
                        setCurrentPage('admin');
                    } else if (userRole === 'user' && currentPage !== 'home' && currentPage !== 'detail') {
                        setCurrentPage('home'); 
                    }
                    console.log(`User role set to: ${userRole}`);
                } else {
                    setRole('user');
                    if (currentPage !== 'detail') { 
                        setCurrentPage('home');
                    }
                    console.warn(`User document for UID ${user.uid} not found. Defaulting role to user.`);
                }
            }, (error) => {
                console.error("Error reading user role (Likely permissions error):", error);
                setRole('guest'); 
                handleSignOut(); 
            });

            return () => {
                console.log("Hủy lắng nghe role Firestore.");
                unsubscribeRole();
            };

        } catch (e) {
            console.error("Lỗi khi thiết lập Role Listener.", e);
            return () => {}; 
        }
    }, [user, currentPage]); 

    // =================================================================
    // 3. HANDLERS 
    // =================================================================
    
    // Đã cập nhật signature của onNavigate để khớp với interface của user
    const onNavigate: NavigateFunction = useCallback((page, courseId) => { 
        setCurrentPage(page);
        setSelectedCourseId(courseId || null);
    }, []);

    // Hàm handleLogout trả về Promise<void>
    const handleLogout = useCallback(async () => {
        await handleSignOut();
    }, []);

    // =================================================================
    // 4. CONTENT RENDERING
    // =================================================================

    const renderContent = (): React.ReactElement => { 
        // 1. LOADING/INIT STATE
        if (!isAuthReady) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <p className="text-xl text-indigo-600">Đang tải ứng dụng và kiểm tra quyền...</p>
                </div>
            );
        }

        // 2. AUTHENTICATED USER (user !== null)
        if (user) {
            
            // Trang chi tiết khóa học
            if (currentPage === 'detail' && selectedCourseId) {
                return (
                    // Nếu đã sửa CourseDetailPageProps, lỗi này sẽ biến mất
                    <CourseDetailPage 
                        courseId={selectedCourseId}
                        onNavigate={onNavigate} 
                    />
                );
            }

            // Dashboard Admin
            if (role === 'admin' && currentPage === 'admin') {
                return (
                    // Nếu đã sửa AdminDashboardProps, lỗi này sẽ biến mất
                    <AdminDashboard 
                        onLogout={handleLogout} 
                        user={user} 
                        onNavigate={onNavigate} 
                    />
                );
            }
            
            // Trang chủ người dùng
            if (role === 'user' && (currentPage === 'home' || currentPage === 'landing' || currentPage === 'admin')) {
                return (
                    // Nếu đã sửa HomePageProps, lỗi này sẽ biến mất
                    <HomePage 
                        onLogout={handleLogout} 
                        user={user} 
                        onNavigate={onNavigate} 
                        role={role}
                    />
                );
            }
            
            // Trường hợp lỗi/đang chờ role được xác định
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <p className="text-xl text-indigo-600">Đang xác định vai trò...</p>
                </div>
            );
        }

        // 3. GUEST (Chưa đăng nhập - user === null)
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
