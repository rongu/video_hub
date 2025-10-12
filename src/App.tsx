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
        apiKey: "AIzaSyAq8YhrxqhFAPaReQ_frgzUMiJiPimMtww",
        authDomain: "video-hub-1.firebaseapp.com",
        projectId: "video-hub-1",
        storageBucket: "video-hub-1.firebasestorage.app",
        messagingSenderId: "165232200741",
        appId: "1:165232200741:web:d34258d29e98f52d7c83cc",
        measurementId: "G-VNF11FGSVK"
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
                setIsAuthReady(true);
                
                if (currentUser) {
                    setCurrentPage('landing'); 
                } else {
                    setCurrentPage('landing'); 
                }
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

    // **Logic Chính:** Kiểm tra trạng thái đăng nhập
    if (user) {
        // Nếu ĐÃ đăng nhập: Chỉ hiển thị LandingPage (tạm thời)
        // LƯU Ý: Phải truyền user và onLogout
        ComponentToRender = (
            <LandingPage 
                onNavigate={onNavigate} 
                user={user} 
                onLogout={handleLogout} 
            />
        );
    } else {
        // Nếu CHƯA đăng nhập: Định tuyến giữa các trang công khai
        switch (currentPage) {
            case 'login':
                ComponentToRender = <LoginPage onNavigate={onNavigate} />;
                break;
            case 'register':
                ComponentToRender = <RegisterPage onNavigate={onNavigate} />;
                break;
            case 'landing':
            default:
                // LƯU Ý: Phải truyền user=null và onLogout (vì chúng là props bắt buộc)
                ComponentToRender = (
                    <LandingPage 
                        onNavigate={onNavigate} 
                        user={null} 
                        onLogout={handleLogout} 
                    />
                );
                break;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 font-inter">
            {ComponentToRender}
        </div>
    );
}

export default App;
