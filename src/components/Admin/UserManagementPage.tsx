import React, { useState, useEffect, useMemo } from 'react';
import { 
    UserPlus, Search, User as UserIcon, BookOpen, 
    CheckCircle2, PlusCircle, Loader2, X, Mail, Shield, ChevronRight
} from 'lucide-react';
import { 
    type AppUser, 
    type Course, 
    subscribeToAppUsers, 
    subscribeToCourses,
    subscribeToUserEnrollments,
    enrollUser,
    unenrollUser,
    adminCreateUserAndProfile,
    tr_h
} from '../../services/firebase';

const UserManagementPage: React.FC = () => {
    // State dữ liệu gốc
    const [users, setUsers] = useState<AppUser[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // State tương tác
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userEnrollments, setUserEnrollments] = useState<string[]>([]); // Danh sách courseId đã ghi danh
    
    // State Modal Tạo User
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUserData, setNewUserData] = useState({ email: '', password: '', displayName: '' });
    
    // State loading/error
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. Load danh sách User và Khóa học ban đầu
    useEffect(() => {
        const unsubUsers = subscribeToAppUsers(setUsers);
        const unsubCourses = subscribeToCourses((fetched) => {
            setCourses(fetched);
        });
        return () => {
            unsubUsers();
            unsubCourses();
        };
    }, []);

    // 2. Lắng nghe ghi danh khi chọn một User cụ thể
    useEffect(() => {
        if (!selectedUserId) {
            setUserEnrollments([]);
            return;
        }
        const unsubEnrollments = subscribeToUserEnrollments(selectedUserId, (enrollments) => {
            setUserEnrollments(enrollments.map(e => e.courseId));
        });
        return () => unsubEnrollments();
    }, [selectedUserId]);

    // 3. Logic lọc danh sách User (Search)
    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return users
            .filter(u => u.displayName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
            .slice(0, 10); // Hiển thị default 10 users hoặc theo kết quả search
    }, [users, searchTerm]);

    const selectedUser = useMemo(() => 
        users.find(u => u.uid === selectedUserId), [users, selectedUserId]
    );

    // 4. Handlers
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await adminCreateUserAndProfile(newUserData.email, newUserData.password, newUserData.displayName);
            setIsCreateModalOpen(false);
            setNewUserData({ email: '', password: '', displayName: '' });
        } catch (error: any) {
            alert("Lỗi tạo user: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleEnrollment = async (courseId: string) => {
        if (!selectedUserId || isProcessing) return;
        setIsProcessing(true);
        try {
            const isCurrentlyEnrolled = userEnrollments.includes(courseId);
            if (isCurrentlyEnrolled) {
                await unenrollUser(selectedUserId, courseId);
            } else {
                await enrollUser(selectedUserId, courseId);
            }
        } catch (error) {
            console.error("Lỗi thay đổi ghi danh:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 argon-card p-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-700 flex items-center">
                        <Shield className="mr-2 text-[#1A73E8]" size={24} /> Quản lý Học viên & Ghi danh
                    </h2>
                    <p className="text-gray-600 text-sm">Tìm kiếm học viên và cấp quyền truy cập khóa học nhanh chóng.</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="argon-button-gradient flex items-center justify-center"
                >
                    <UserPlus size={20} className="mr-2" /> Tạo tài khoản mới
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CỘT TRÁI: SEARCHABLE USER LISTBOX */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="argon-card p-4 flex flex-col h-[600px]">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Tìm tên hoặc email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="argon-input pl-10 py-3"
                            />
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            <h3 className="text-xs font-semibold text-gray-600 px-2 mb-2">Danh sách học viên</h3>
                            {filteredUsers.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm italic">Không tìm thấy user nào</div>
                            ) : (
                                filteredUsers.map(u => (
                                    <div 
                                        key={u.uid}
                                        onClick={() => setSelectedUserId(u.uid)}
                                        className={`group p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                                            selectedUserId === u.uid 
                                                ? 'border-[#1A73E8] shadow-sm' 
                                                : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                                        }`}
                                        style={selectedUserId === u.uid ? {background: 'linear-gradient(195deg, #49A3F1, #1A73E8)'} : {}}
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div className={`p-2 rounded-xl flex-shrink-0 ${selectedUserId === u.uid ? 'bg-white/20' : 'bg-gray-100'}`}>
                                                <UserIcon size={18} className={selectedUserId === u.uid ? 'text-white' : 'text-gray-500'} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className={`text-sm font-bold truncate ${selectedUserId === u.uid ? 'text-white' : 'text-gray-800'}`}>
                                                    {u.displayName}
                                                </p>
                                                <p className={`text-[10px] truncate ${selectedUserId === u.uid ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    {u.email}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className={selectedUserId === u.uid ? 'text-white' : 'text-gray-300'} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: ENROLLMENT CARD GRID */}
                <div className="lg:col-span-2">
                    {selectedUserId ? (
                        <div className="argon-card p-6 min-h-[600px]">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-700">
                                        Khóa học của <span className="text-[#1A73E8]">{selectedUser?.displayName}</span>
                                    </h3>
                                    <p className="text-sm text-gray-600">Nhấn vào thẻ để Ghi danh hoặc Hủy ghi danh.</p>
                                </div>
                                <div className="text-right">
                                    <span className="bg-blue-50 text-[#1A73E8] px-3 py-1 rounded-full text-xs font-bold">
                                        {userEnrollments.length} / {courses.length} KHÓA
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {courses.map(course => {
                                    const isEnrolled = userEnrollments.includes(course.id);
                                    return (
                                        <div 
                                            key={course.id}
                                            onClick={() => toggleEnrollment(course.id)}
                                            className={`relative group p-4 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between h-32 overflow-hidden ${
                                                isEnrolled 
                                                    ? 'bg-blue-50 border-blue-500 shadow-sm' 
                                                    : 'bg-gray-50 border-transparent hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className={`p-2 rounded-xl ${isEnrolled ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                                    <BookOpen size={18} className="text-white" />
                                                </div>
                                                {isEnrolled ? (
                                                    <CheckCircle2 size={24} className="text-blue-500" />
                                                ) : (
                                                    <PlusCircle size={24} className="text-gray-300 group-hover:text-gray-400" />
                                                )}
                                            </div>
                                            
                                            <div>
                                                <h4 className={`font-bold text-sm leading-tight mb-1 ${isEnrolled ? 'text-blue-900' : 'text-gray-700'}`}>
                                                    {tr_h(course.title)}
                                                </h4>
                                                <p className={`text-[10px] ${isEnrolled ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    {course.videoCount} videos
                                                </p>
                                            </div>

                                            {/* Hiệu ứng loading nhỏ khi đang xử lý card này */}
                                            {isProcessing && (
                                                <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-[#1A73E8]" size={20} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="argon-card p-6 min-h-[600px] flex flex-col items-center justify-center text-center">
                            <div className="p-6 bg-blue-50 rounded-full mb-4">
                                <UserIcon size={48} className="text-blue-200" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700">Chọn một học viên</h3>
                            <p className="text-gray-600 max-w-xs mt-2">Vui lòng chọn học viên ở danh sách bên trái để quản lý ghi danh khóa học.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: TẠO TÀI KHOẢN MỚI */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="argon-card w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 flex justify-between items-center text-white" style={{background: 'linear-gradient(195deg, #49A3F1, #1A73E8)'}}>
                            <div>
                                <h3 className="text-xl font-bold">Tạo tài khoản học viên</h3>
                                <p className="text-blue-100 text-xs">Điền thông tin để đăng ký tài khoản mới.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 ml-1">Họ và tên</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        required
                                        type="text"
                                        placeholder="Nguyễn Văn A"
                                        className="argon-input pl-10 py-3"
                                        value={newUserData.displayName}
                                        onChange={(e) => setNewUserData({...newUserData, displayName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        required
                                        type="email"
                                        placeholder="hocvien@email.com"
                                        className="argon-input pl-10 py-3"
                                        value={newUserData.email}
                                        onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 ml-1">Mật khẩu</label>
                                <input 
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="argon-input py-3"
                                    value={newUserData.password}
                                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                                />
                            </div>

                            <div className="pt-4 flex space-x-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-grow py-3 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200 transition border border-gray-200"
                                >
                                    Hủy bỏ
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isProcessing}
                                    className="argon-button-gradient flex-grow py-3 flex items-center justify-center"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Tạo tài khoản'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;