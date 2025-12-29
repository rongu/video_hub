import React, { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { getFirebaseAuth, handleSignOut } from '../services/firebase';
import { 
    LayoutDashboard, Users, LogOut, Plus, Search, 
    PlusCircle
} from 'lucide-react';

import CourseCard from '../components/Admin/CourseCard';
import CreateCourseForm from '../components/Admin/CreateCourseForm';
import CreateVideoForm from '../components/Admin/CreateVideoForm';
import CreateCourseFormWrapper from '../components/Admin/CreateCourseForm'; // Re-use for Edit
import VideoList from '../components/Admin/VideoList';
import UserManagementPage from '../components/Admin/UserManagementPage';
import SessionManagerForm from '../components/Admin/SessionManagerForm'; 
import { subscribeToCourses, type Course, deleteCourse } from '../services/firebase/courses';
import ConfirmDeleteModal from '../components/Admin/ConfirmDeleteModal';

import useCourseSessions from '../hooks/useCourseSessions';
import { subscribeToVideos, type Video as IVideo } from '../services/firebase';

// ✅ ĐỊNH NGHĨA LẠI PageType CHO KHỚP VỚI APP.TSX
export type PageType = 'landing' | 'login' | 'register' | 'home' | 'admin' | 'detail';

// --- COMPONENT CON: VIDEO MANAGER CONTAINER ---
const VideoManagerContainer: React.FC<{ 
    courseId: string; 
    onAddVideo: () => void; 
}> = ({ courseId, onAddVideo }) => {
    const [sessions] = useCourseSessions(courseId);
    const [videos, setVideos] = useState<IVideo[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToVideos(courseId, null, (fetchedVideos) => {
            setVideos(fetchedVideos);
        });
        return () => unsubscribe();
    }, [courseId]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-end">
                <button 
                    onClick={onAddVideo}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-sm"
                >
                    <PlusCircle size={18} className="mr-2"/> Thêm Video / Bài học
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                <VideoList 
                    courseId={courseId} 
                    sessions={sessions} 
                    videos={videos} 
                />
            </div>
        </div>
    );
};

// --- ĐỊNH NGHĨA PROPS CHO ADMIN DASHBOARD ---
interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
    // ✅ FIX: Sửa lại type của page để khớp với App.tsx
    onNavigate: (page: PageType, courseId?: string | null) => void;
}

// --- COMPONENT CHÍNH ---
const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'courses' | 'users'>('courses');
    
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals State
    const [showCreateCourse, setShowCreateCourse] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
    const [selectedCourseForVideos, setSelectedCourseForVideos] = useState<Course | null>(null);
    const [courseForVideoCreation, setCourseForVideoCreation] = useState<{id: string, title: string} | null>(null);

    // Session Manager State
    const [sessionManagerData, setSessionManagerData] = useState<{
        isOpen: boolean;
        courseId: string;
        courseTitle: string;
        selectedSessionId: string | null;
        onSelectCallback?: (id: string, title: string) => void;
    }>({ isOpen: false, courseId: '', courseTitle: '', selectedSessionId: null });

    useEffect(() => {
        const unsubscribe = subscribeToCourses((fetchedCourses) => {
            setCourses(fetchedCourses);
            setLoadingCourses(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDeleteCourse = async () => {
        if (deletingCourse) {
            await deleteCourse(deletingCourse.id);
            setDeletingCourse(null);
        }
    };

    const openSessionManager = (courseId: string, courseTitle: string, currentSessionId: string | null, onSelect: (id: string, title: string) => void) => {
        setSessionManagerData({
            isOpen: true,
            courseId,
            courseTitle,
            selectedSessionId: currentSessionId,
            onSelectCallback: onSelect
        });
    };

    const renderContent = () => {
        if (activeTab === 'users') {
            return <UserManagementPage />;
        }

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm khóa học..." 
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowCreateCourse(true)}
                        className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition flex items-center justify-center"
                    >
                        <Plus className="mr-2" size={20} /> Tạo Khóa Học Mới
                    </button>
                </div>

                {loadingCourses ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {courses
                            .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(course => (
                            <CourseCard 
                                key={course.id} 
                                course={course} 
                                onEditCourse={() => setEditingCourse(course)}
                                onDeleteCourse={() => setDeletingCourse(course)}
                                onManageVideos={() => setSelectedCourseForVideos(course)}
                                isSelected={false} 
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
            {/* SIDEBAR */}
            <aside className="w-20 lg:w-64 bg-white border-r border-gray-100 flex-shrink-0 fixed h-full z-20 hidden md:flex flex-col">
                <div className="p-6 flex items-center justify-center lg:justify-start border-b border-gray-50">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg text-white font-black text-xl">V</div>
                    <span className="ml-3 font-black text-xl hidden lg:block text-gray-800 tracking-tight">VIDEO HUB</span>
                </div>
                
                <nav className="flex-grow p-4 space-y-2">
                    <button onClick={() => setActiveTab('courses')} className={`w-full flex items-center p-3 rounded-xl transition font-bold ${activeTab === 'courses' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                        <LayoutDashboard size={22} /><span className="ml-3 hidden lg:block">Quản lý Khóa học</span>
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center p-3 rounded-xl transition font-bold ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                        <Users size={22} /><span className="ml-3 hidden lg:block">Học viên</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-50">
                    <button onClick={onLogout} className="w-full flex items-center p-3 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition font-bold">
                        <LogOut size={22} /><span className="ml-3 hidden lg:block">Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-grow md:ml-20 lg:ml-64 p-6 lg:p-10">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
                        <p className="text-gray-400 font-medium text-sm mt-1">Xin chào, {user.email}</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                        {user.email?.charAt(0).toUpperCase()}
                    </div>
                </header>
                {renderContent()}
            </main>

            {/* --- MODALS --- */}

            {/* 1. Create Course */}
            {showCreateCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <CreateCourseForm 
                        user={user} 
                        initialCourse={null}
                        onCourseSaved={() => setShowCreateCourse(false)} 
                    />
                </div>
            )}

            {/* 2. Edit Course */}
            {editingCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <CreateCourseForm 
                        user={user}
                        initialCourse={editingCourse}
                        onCourseSaved={() => setEditingCourse(null)} 
                    />
                </div>
            )}

            {/* 3. Delete Course Confirm */}
            {deletingCourse && (
                <ConfirmDeleteModal 
                    isOpen={!!deletingCourse}
                    onClose={() => setDeletingCourse(null)}
                    onConfirm={handleDeleteCourse}
                    title={`Xóa khóa học: ${deletingCourse.title}?`} 
                    description="Hành động này không thể hoàn tác. Tất cả video và dữ liệu liên quan sẽ bị xóa."
                    isProcessing={false}
                />
            )}

            {/* 4. Video List Manager */}
            {selectedCourseForVideos && (
                <div className="fixed inset-0 z-50 bg-gray-50 overflow-hidden flex flex-col">
                    <div className="bg-white px-6 py-4 border-b flex justify-between items-center shadow-sm z-10">
                        <button onClick={() => setSelectedCourseForVideos(null)} className="flex items-center text-gray-500 hover:text-gray-900 font-bold">
                            <span className="mr-2">←</span> Quay lại Dashboard
                        </button>
                        <h2 className="font-black text-xl uppercase text-indigo-600">{selectedCourseForVideos.title}</h2>
                    </div>
                    
                    <div className="flex-grow overflow-hidden relative">
                        <VideoManagerContainer 
                            courseId={selectedCourseForVideos.id} 
                            onAddVideo={() => setCourseForVideoCreation({ 
                                id: selectedCourseForVideos.id, 
                                title: selectedCourseForVideos.title 
                            })}
                        />
                    </div>
                </div>
            )}

            {/* 5. CREATE VIDEO FORM */}
            {courseForVideoCreation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <CreateVideoForm 
                        courseId={courseForVideoCreation.id} 
                        courseTitle={courseForVideoCreation.title} 
                        adminUser={user}
                        onClose={() => setCourseForVideoCreation(null)}
                        onVideoCreated={() => { /* Realtime update will handle list refresh */ }}
                        onRequestSessionManager={(currentId, onSelect) => {
                             openSessionManager(courseForVideoCreation.id, courseForVideoCreation.title, currentId, onSelect);
                        }}
                    />
                </div>
            )}

            {/* 6. SESSION MANAGER FORM */}
            {sessionManagerData.isOpen && (
                <SessionManagerForm 
                    courseId={sessionManagerData.courseId}
                    courseTitle={sessionManagerData.courseTitle}
                    selectedSessionId={sessionManagerData.selectedSessionId}
                    onClose={() => setSessionManagerData(prev => ({ ...prev, isOpen: false }))}
                    onSessionSelected={(id, title) => {
                        if (sessionManagerData.onSelectCallback) {
                            sessionManagerData.onSelectCallback(id, title);
                        }
                        setSessionManagerData(prev => ({ ...prev, isOpen: false }));
                    }}
                />
            )}
        </div>
    );
};

export default AdminDashboard;