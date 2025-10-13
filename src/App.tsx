import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

// Imports các services cần thiết cho Video Hub
import { 
    initializeAndAuthenticate, 
    getFirebaseAuth, 
    getFirestoreDb, 
    handleSignOut, 
    getUserDocumentPath 
} from './services/firebase';

// Imports các trang giao diện 
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserCoursesPage from './pages/UserCoursesPage'; 
import AdminDashboard from './pages/AdminDashboard'; 

type PageType = 'landing' | 'login' | 'register' | 'user' | 'admin';
type UserRole = 'user' | 'admin' | 'guest';

// Component chính của ứng dụng
const App: React.FC = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState<PageType>('landing');
    const [role, setRole] = useState<UserRole>('guest'); 

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
    // 2. ROLE ROUTING & CLEANUP (Sửa lỗi 400 Bad Request ở đây)
    // =================================================================
    useEffect(() => {
        // Nếu người dùng chưa sẵn sàng hoặc không tồn tại, không làm gì cả
        if (!user) {
            // Khi user là null (đăng xuất), chúng ta đã đặt role='guest' ở Auth listener
            return; 
        }

        let unsubscribeRole: () => void;
        
        try {
            const db = getFirestoreDb();
            const userDocRef = getUserDocumentPath(user.uid);
            
            // Bắt đầu lắng nghe Role khi user đã có
            unsubscribeRole = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    const userRole = userData.role as UserRole || 'user';
                    setRole(userRole);
                    
                    if (userRole === 'admin') {
                        setCurrentPage('admin');
                    } else {
                        setCurrentPage('user'); 
                    }
                    console.log(`User role set to: ${userRole}`);
                } else {
                    setRole('guest');
                    console.warn(`User document for UID ${user.uid} not found. Role set to guest.`);
                }
            }, (error) => {
                console.error("Error reading user role (Likely permissions error):", error);
                setRole('guest'); 
                // Đăng xuất nếu lỗi quyền truy cập nghiêm trọng để reset
                handleSignOut(); 
            });

            // HÀM CLEANUP: Đây là phần quan trọng nhất.
            // Khi `user` thay đổi (tức là đăng xuất), hàm này sẽ được gọi
            // để hủy `onSnapshot` trước khi Auth bị hủy hoàn toàn.
            return () => {
                console.log("Hủy lắng nghe role Firestore.");
                unsubscribeRole();
            };

        } catch (e) {
            console.error("Lỗi khi thiết lập Role Listener.", e);
            return () => {}; // Trả về cleanup function rỗng nếu có lỗi khởi tạo
        }
    }, [user]); // Chỉ phụ thuộc vào user

    // =================================================================
    // 3. HANDLERS
    // =================================================================
    
    const onNavigate = useCallback((page: PageType) => {
        setCurrentPage(page);
    }, []);

    const handleLogout = useCallback(async () => {
        await handleSignOut();
        // Sau khi đăng xuất, Auth listener sẽ tự động set user=null, 
        // kích hoạt cleanup ở useEffect [user] và điều hướng về 'landing'.
    }, []);

    // =================================================================
    // 4. CONTENT RENDERING (Không đổi)
    // =================================================================

    const renderContent = (): React.ReactElement => { 
        if (!isAuthReady || (user && role === 'guest')) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <p className="text-xl text-indigo-600">Đang tải ứng dụng và kiểm tra quyền...</p>
                </div>
            );
        }

        if (user && role !== 'guest') {
            if (role === 'admin') {
                return <AdminDashboard onLogout={handleLogout} user={user} />;
            }
            return <UserCoursesPage onLogout={handleLogout} user={user} />;
        }

        let ComponentToRender: React.ReactElement; 

        switch (currentPage) {
            case 'login':
                ComponentToRender = <LoginPage onNavigate={onNavigate} />;
                break;
            case 'register':
                ComponentToRender = <RegisterPage onNavigate={onNavigate} />;
                break;
            case 'landing':
            case 'user': 
            case 'admin':
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
