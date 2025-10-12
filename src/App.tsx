import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    type Auth, 
    type User,
    signOut 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Imports các Component (SỬA LỖI: Bỏ đuôi .tsx và KHÔNG import DashboardPage)
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Định nghĩa các loại trang mà ứng dụng có thể hiển thị
type Page = 'landing' | 'login' | 'register' | 'dashboard';


const App: React.FC = () => {
    // State quản lý trang hiện tại. Khởi tạo là 'landing'
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [user, setUser] = useState<User | null>(null); // Lưu trữ đối tượng User đang đăng nhập
    const [isAuthReady, setIsAuthReady] = useState(false); // Trạng thái sẵn sàng của Auth
    const [db, setDb] = useState<Firestore | null>(null); // Instance Firestore
    const [auth, setAuth] = useState<Auth | null>(null); // Instance Auth

    const onNavigate = useCallback((page: Page) => {
        setCurrentPage(page);
    }, []);

    // Xử lý Đăng xuất
    const handleLogout = async () => {
        if (auth) {
            try {
                await signOut(auth);
                // Sau khi đăng xuất, onAuthStateChanged sẽ cập nhật user về null
            } catch (error) {
                console.error("Lỗi khi đăng xuất:", error);
            }
        }
    };

    // Cấu hình dự phòng cho môi trường Local PC
    const FALLBACK_FIREBASE_CONFIG = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "API_KEY_NOT_SET",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    };

    useEffect(() => {
        let firebaseApp: FirebaseApp;
        let configToUse;
        let initialAuthToken = undefined;

        // 1. Lấy Config
        if (typeof __firebase_config !== 'undefined' && __firebase_config) {
            configToUse = JSON.parse(__firebase_config);
            initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;
        } else {
            console.log("Sử dụng cấu hình Firebase dự phòng (Local PC)");
            configToUse = FALLBACK_FIREBASE_CONFIG;
        }

        try {
            // 2. KHẮC PHỤC LỖI DUPLICATE APP
            if (getApps().length === 0) {
                firebaseApp = initializeApp(configToUse);
            } else {
                firebaseApp = getApp(); // Lấy app đã được khởi tạo
            }

            const currentAuth = getAuth(firebaseApp);
            const currentDb = getFirestore(firebaseApp);

            setAuth(currentAuth);
            setDb(currentDb);

            // 3. Thực hiện Đăng nhập ban đầu (Custom Token hoặc Ẩn danh)
            const authenticate = async () => {
                if (initialAuthToken) {
                    await signInWithCustomToken(currentAuth, initialAuthToken);
                } else {
                    await signInAnonymously(currentAuth);
                }
            };

            // 4. Thiết lập Listener (Theo dõi trạng thái Auth)
            const unsubscribe = onAuthStateChanged(currentAuth, (currentUser) => {
                setUser(currentUser);
                console.log('currentUser login Firebase:', currentUser);
                if (currentUser) {
                    // Đã đăng nhập: Chuyển sang Dashboard
                    setCurrentPage('dashboard'); // MỚI
                } else {
                    setCurrentPage('landing'); 
                }
                setIsAuthReady(true);
            });
            
            authenticate();

            return () => unsubscribe();
        } catch (error) {
            // Lỗi này có thể vẫn là Invalid API Key nếu config sai
            console.error('Lỗi khởi tạo Firebase:', error);
        }
    }, []);

    // **Logic Render Bắt đầu từ đây:**
    // Hiển thị Loading trong khi Auth đang được thiết lập
    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl font-semibold text-indigo-600 animate-pulse">
                    Đang kết nối dịch vụ...
                </div>
            </div>
        );
    }

    let ComponentToRender;

    // 2. Nếu ĐÃ đăng nhập: Luôn hiển thị Dashboard (trừ khi Logout)
    if (user) {
        // Nếu đã đăng nhập, ta bỏ qua logic switch, chỉ hiển thị Dashboard
        // và chỉ chuyển về 'landing' khi user gọi hàm onLogout (handleLogout)
        return <DashboardPage onLogout={handleLogout} />;
    }

    // 3. Nếu CHƯA đăng nhập: Chỉ định tuyến giữa các trang công khai/đăng nhập/đăng ký

    switch (currentPage) {
        case 'login':
            ComponentToRender = <LoginPage onNavigate={onNavigate} />;
            break;
        case 'register':
            ComponentToRender = <RegisterPage onNavigate={onNavigate} />;
            break;
        case 'landing':
        default:
            // Trang Landing khi chưa đăng nhập
            ComponentToRender = (
                <LandingPage 
                    onNavigate={onNavigate} 
                    user={null} // Đã chắc chắn là null ở đây
                    onLogout={handleLogout} 
                />
            );
            break;
    }

    // Bọc các Component không phải Dashboard (Landing, Login, Register) trong layout căn giữa
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
            {ComponentToRender}
        </div>
    );
}

export default App;
