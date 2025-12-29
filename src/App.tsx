import React, { useEffect, useState, useCallback } from 'react';
import { type User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore'; 
import { Loader2 } from 'lucide-react'; 

import { 
    getFirebaseAuth, 
    getFirestoreDb, 
    handleSignOut, 
    getAppUsersCollectionRef,
    type AppUser 
} from './services/firebase'; 

import LandingPage from './pages/LandingPage'; 
import LoginPage from './pages/LoginPage'; 
import RegisterPage from './pages/RegisterPage'; 
import HomePage from './pages/HomePage'; 
import AdminDashboard from './pages/AdminDashboard'; 
import CourseDetailPage from './pages/CourseDetailPage'; 

// Định nghĩa Page Type khớp với AdminDashboard
export type PageType = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail'; 
type UserRole = 'student' | 'admin' | null; 
type NavigateFunction = (page: PageType, courseId?: string | null) => void;

const parseUrl = (pathname: string): { page: PageType, courseId: string | null } => {
    const path = pathname.toLowerCase().replace(/\/$/, '') || '/'; 
    const detailMatch = path.match(/\/detail\/([a-zA-Z0-9_-]+)/);
    if (detailMatch) return { page: 'detail', courseId: detailMatch[1] };
    if (path === '/home') return { page: 'home', courseId: null };
    if (path === '/admin') return { page: 'admin', courseId: null };
    if (path === '/login') return { page: 'login', courseId: null };
    if (path === '/register') return { page: 'register', courseId: null };
    return { page: 'landing', courseId: null };
};

const App: React.FC = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null); 
    
    const initialRoute = parseUrl(window.location.pathname);
    const [currentPage, setCurrentPage] = useState<PageType>(initialRoute.page);
    const [currentCourseId, setCurrentCourseId] = useState<string | null>(initialRoute.courseId);
    const [dbInstance, setDbInstance] = useState<Firestore | null>(null);

    const onNavigate: NavigateFunction = useCallback((page, courseId = null) => {
        let path = '';
        if (page === 'landing') path = '/';
        else if (page === 'detail' && courseId) path = `/detail/${courseId}`;
        else path = `/${page}`;

        window.history.pushState({}, '', path);
        setCurrentPage(page);
        setCurrentCourseId(courseId);
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const auth = getFirebaseAuth();
        setDbInstance(getFirestoreDb()); 

        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            setRole(null); 
            setIsAuthReady(true);
            
            if (!currentUser) {
                const currentRoute = parseUrl(window.location.pathname);
                if (['home', 'admin'].includes(currentRoute.page)) {
                    onNavigate('landing'); 
                }
            }
        });
        
        const handlePopState = () => {
            const newRoute = parseUrl(window.location.pathname);
            setCurrentPage(newRoute.page);
            setCurrentCourseId(newRoute.courseId);
        };

        window.addEventListener('popstate', handlePopState);
        return () => { 
            unsubscribeAuth();
            window.removeEventListener('popstate', handlePopState) 
        };
    }, [onNavigate]);

    useEffect(() => {
        if (!user || !dbInstance) return;
        const usersCollectionRef = getAppUsersCollectionRef();
        const userRoleDocRef = doc(usersCollectionRef, user.uid); 

        const unsubscribeRole = onSnapshot(userRoleDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as AppUser; 
                setRole(data.role as UserRole);
                
                const currentRoute = parseUrl(window.location.pathname);
                
                // --- LOGIC ROUTING & BẢO VỆ MỚI ---
                if (data.role === 'admin') {
                    // Admin không được ở các trang của User/Guest
                    if (['login', 'register', 'home', 'landing'].includes(currentRoute.page)) {
                        onNavigate('admin');
                    }
                } else {
                    // Student không được vào trang Admin
                    if (currentRoute.page === 'admin') {
                        onNavigate('home');
                    }
                    // Student đã login không được vào Login/Register
                    if (['login', 'register'].includes(currentRoute.page)) {
                        onNavigate('home');
                    }
                }
            } else {
                setRole('student');
            }
        });
        return () => unsubscribeRole();
    }, [user, dbInstance, onNavigate]);

    const handleLogout = useCallback(async () => {
        await handleSignOut();
        onNavigate('landing');
    }, [onNavigate]);

    const renderContent = () => {
        if (!isAuthReady || !dbInstance) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                </div>
            );
        }

        if (currentPage === 'detail' && currentCourseId) {
            return <CourseDetailPage courseId={currentCourseId} onNavigate={onNavigate} />;
        }
        if (currentPage === 'landing') {
            return <LandingPage onNavigate={onNavigate} user={user} onLogout={handleLogout} />;
        }
        if (currentPage === 'login' && !user) return <LoginPage onNavigate={onNavigate} />;
        if (currentPage === 'register' && !user) return <RegisterPage onNavigate={onNavigate} />;

        if (user && role) {
            if (role === 'admin' && currentPage === 'admin') {
                return <AdminDashboard user={user} onLogout={handleLogout}/>;
            }
            return <HomePage onLogout={handleLogout} user={user} onNavigate={onNavigate} role={role} />;
        }

        return <LandingPage onNavigate={onNavigate} user={user} onLogout={handleLogout} />;
    };

    return renderContent();
};

export default App;