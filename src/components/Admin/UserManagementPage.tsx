import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Plus, UserPlus, X, Check, Loader2, ArrowRight } from 'lucide-react';
// ✅ Đường dẫn này phải đúng: '../../services/firebase'
import { 
    type AppUser, 
    type Course,
    subscribeToAppUsers, 
    enrollUser, 
    unenrollUser,
    adminCreateUserAndProfile,
    subscribeToCourses, 
    getEnrollmentsCollectionRef, 
} from '../../services/firebase'; 
import { onSnapshot, doc } from 'firebase/firestore'; 

// =================================================================
// 1. COMPONENT TẠO USER MỚI (Giữ nguyên)
// =================================================================

interface CreateUserFormProps {
    onUserCreated: () => void;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onUserCreated }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // Sau khi tạo user, Admin sẽ bị đăng xuất (Hành vi hiện tại đã chấp nhận)
            const newUser = await adminCreateUserAndProfile(email, password, displayName);
            setMessage({ type: 'success', text: `Tạo user ${newUser.email} thành công! Vui lòng đăng nhập lại Admin.` });
            setEmail('');
            setPassword('');
            setDisplayName('');
            onUserCreated(); // Kích hoạt refresh danh sách
        } catch (err: any) {
            setMessage({ type: 'error', text: `Lỗi tạo user: ${err.message || 'Lỗi không xác định.'}` });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border rounded-xl shadow-lg bg-white space-y-4">
            <h3 className="text-xl font-bold text-indigo-700 flex items-center">
                <UserPlus className="w-5 h-5 mr-2" /> Tạo User Mới
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <input type="text" placeholder="Tên hiển thị" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full p-2 border rounded-lg" disabled={loading} />
                <input type="email" placeholder="Email (Tên đăng nhập)" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border rounded-lg" disabled={loading} />
                <input type="password" placeholder="Mật khẩu (Tối thiểu 6 ký tự)" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border rounded-lg" minLength={6} disabled={loading} />
                <button type="submit" disabled={loading} className={`w-full py-2 flex justify-center items-center rounded-lg text-white font-semibold transition ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    Tạo User
                </button>
            </form>
            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

// =================================================================
// 2. COMPONENT QUẢN LÝ GHI DANH VÀ DANH SÁCH USER
// =================================================================

const UserManagementPage: React.FC = () => {
    // FIX: Đảm bảo appUsers hiển thị tài khoản đã tạo
    const [appUsers, setAppUsers] = useState<AppUser[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [userUpdateKey, setUserUpdateKey] = useState(0); 

    // ------------------------------------
    // Lắng nghe danh sách Users và Courses
    // ------------------------------------
    useEffect(() => {
        setLoading(true);
        // 1. Lắng nghe Users (Sử dụng hàm subscribeToAppUsers đã có trong firebase.ts)
        const unsubUsers = subscribeToAppUsers((fetchedUsers) => {
            setAppUsers(fetchedUsers);
            setLoading(false);
        });

        // 2. Lắng nghe Courses (Sử dụng hàm subscribeToCourses đã có trong firebase.ts)
        const unsubCourses = subscribeToCourses((fetchedCourses) => {
            setCourses(fetchedCourses);
        });

        return () => {
            unsubUsers();
            unsubCourses();
        };
    }, [userUpdateKey]);

    // ------------------------------------
    // Xử lý Ghi danh (Enrollment)
    // ------------------------------------
    const handleEnrollmentToggle = useCallback(async (userId: string, courseId: string, isEnrolled: boolean) => {
        try {
            if (isEnrolled) {
                await unenrollUser(userId, courseId);
            } else {
                await enrollUser(userId, courseId);
            }
        } catch (err: any) {
            alert(`Thao tác ghi danh thất bại: ${err.message}`);
        }
    }, []);

    // ------------------------------------
    // Render
    // ------------------------------------
    
    if (loading) {
        return <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mt-10" />;
    }
    
    // Kiểm tra: Nếu chưa có khóa học, không thể gán
    if (courses.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-red-600">Lỗi Cấu hình</h3>
                <p>Vui lòng tạo ít nhất một Khóa học trước khi quản lý ghi danh User.</p>
                <p className='text-sm text-gray-500 mt-2'>Lưu ý: Nếu bạn vừa đăng nhập lại, vui lòng refresh trang để tải lại khóa học.</p>
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    {/* Component Tạo User */}
                    <CreateUserForm onUserCreated={() => setUserUpdateKey(prev => prev + 1)} />
                </div>

                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                    <h3 className="text-xl font-bold text-indigo-700 border-b pb-2 mb-4">Quản lý Ghi danh User ({appUsers.length})</h3>
                    
                    <div className="overflow-x-auto">
                        {/* Bảng Hiển thị Users và Trạng thái Ghi danh */}
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {/* Cột User */}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">User</th>
                                    {/* Cột Khóa học (Được tạo động từ courses state) */}
                                    {courses.map(course => (
                                        <th key={course.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] whitespace-nowrap sticky top-0 bg-gray-50 z-10">
                                            {course.title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {appUsers.map(user => (
                                    <tr key={user.uid} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                                            <div className="text-xs text-gray-500">{user.email} (Role: {user.role})</div>
                                            <div className="text-xs text-gray-400 break-all">UID: {user.uid}</div>
                                        </td>
                                        {courses.map(course => (
                                            <td key={course.id} className="px-6 py-4 whitespace-nowrap text-center">
                                                {/* Component Button quản lý Ghi danh */}
                                                <EnrollmentStatusButton 
                                                    userId={user.uid} 
                                                    courseId={course.id}
                                                    onToggle={handleEnrollmentToggle}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// 3. COMPONENT KIỂM TRA ENROLLMENT (Dùng onSnapshot để lắng nghe trạng thái)
// =================================================================

interface EnrollmentStatusButtonProps {
    userId: string;
    courseId: string;
    onToggle: (userId: string, courseId: string, isEnrolled: boolean) => void;
}

const EnrollmentStatusButton: React.FC<EnrollmentStatusButtonProps> = ({ userId, courseId, onToggle }) => {
    // isEnrolled: Trạng thái ghi danh hiện tại (true/false)
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [loading, setLocalLoading] = useState(false);
    
    // ✅ Logic kiểm tra Enrollment real-time
    useEffect(() => {
        if (!userId || !courseId) return;
        
        const enrollmentRef = getEnrollmentsCollectionRef(); 
        // ID Document trong collection `enrollments` là {userId}_{courseId}
        const enrollmentId = `${userId}_${courseId}`; 
        
        // Lắng nghe trạng thái ghi danh của user cho khóa học này
        const unsubscribe = onSnapshot(doc(enrollmentRef, enrollmentId), (docSnap) => {
            // Nếu document tồn tại -> User đã ghi danh
            setIsEnrolled(docSnap.exists());
        }, (err) => {
            console.error(`Lỗi lắng nghe Enrollment ${enrollmentId}:`, err);
        });

        return () => unsubscribe();
    }, [userId, courseId]);


    const handleClick = async () => {
        setLocalLoading(true);
        // Gọi hàm toggle cha để thực hiện logic DB
        await onToggle(userId, courseId, isEnrolled);
        // Sau khi DB update, useEffect trên sẽ tự động cập nhật isEnrolled
        setLocalLoading(false);
    };

    return (
        <button 
            onClick={handleClick} 
            disabled={loading} 
            className={`py-1 px-3 text-xs font-semibold rounded-full transition duration-150 flex items-center justify-center min-w-[80px] ${
                isEnrolled 
                    ? 'bg-red-500 text-white hover:bg-red-600' // Đang ghi danh -> Nút Hủy Gán (Unenroll)
                    : 'bg-green-500 text-white hover:bg-green-600' // Chưa ghi danh -> Nút Gán (Enroll)
            }`}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEnrolled ? (
                <>
                    <X className="w-4 h-4 mr-1" /> Hủy Gán
                </>
            ) : (
                <>
                    <Check className="w-4 h-4 mr-1" /> Gán Khóa học
                </>
            )}
        </button>
    );
};


export default UserManagementPage;