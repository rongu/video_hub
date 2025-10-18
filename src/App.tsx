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
    // BỎ: Course type
} from './services/firebase.ts'; // <-- SỬA LỖI: Thêm .ts

// Imports các trang giao diện 
import LandingPage from './pages/LandingPage.tsx'; // <-- SỬA LỖI: Thêm .tsx
import LoginPage from './pages/LoginPage.tsx'; // <-- SỬA LỖI: Thêm .tsx
import RegisterPage from './pages/RegisterPage.tsx'; // <-- SỬA LỖI: Thêm .tsx
import HomePage from './pages/HomePage.tsx'; // <-- SỬ DỤNG HomePage (SỬA LỖI: Thêm .tsx)
import AdminDashboard from './pages/AdminDashboard.tsx'; // <-- SỬA LỖI: Thêm .tsx

type PageType = 'landing' | 'login' | 'register' | 'user' | 'admin';
type UserRole = 'user' | 'admin' | 'guest';

// Component chính của ứng dụng
const App: React.FC = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState<PageType>('landing');
    const [role, setRole] = useState<UserRole>('guest'); 

    // BỎ: selectedUserCourse

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
                        setCurrentPage('landing'); // Đảm bảo luôn về landing khi user = null
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
                    
                    if (userRole === 'admin') {
                        setCurrentPage('admin');
                    } else {
                        setCurrentPage('user'); 
                    }
                    console.log(`User role set to: ${userRole}`);
                } else {
                    // Nếu document không tồn tại, coi là user mới và set mặc định 'user'
                    setRole('user');
                    setCurrentPage('user');
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
    }, [user]); 

    // =================================================================
    // 3. HANDLERS 
    // =================================================================
    
    const onNavigate = useCallback((page: PageType) => {
        setCurrentPage(page);
    }, []);

    const handleLogout = useCallback(async () => {
        await handleSignOut();
        // Auth listener sẽ xử lý việc reset user/role/page sau khi signOut
    }, []);

    // =================================================================
    // 4. CONTENT RENDERING (Đảm bảo luồng ưu tiên Auth/Role)
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
            // Đã đăng nhập, hiển thị nội dung dựa trên role và currentPage
            if (role === 'admin' && currentPage === 'admin') {
                return <AdminDashboard onLogout={handleLogout} user={user} />;
            }
            
            if (role === 'user' && currentPage === 'user') {
                // Trang chủ danh sách khóa học (Level 4.1)
                return <HomePage onLogout={handleLogout} user={user} />;
            }
            
            // Trường hợp lỗi: Đã đăng nhập nhưng role không khớp với currentPage (Rất hiếm)
            // Trong trường hợp này, ứng dụng sẽ đợi useEffect Role Listener đẩy về trang đúng.
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
                // Mặc định cho người dùng chưa đăng nhập
                ComponentToRender = (
                    <LandingPage 
                        onNavigate={onNavigate} 
                        user={null} 
                        onLogout={handleLogout} // onLogout ở đây chỉ là dummy/hỗ trợ
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
