import React, { useState, useMemo, type FormEvent } from 'react';
import { 
    X, Plus, Trash2, CheckCircle, Pencil, Loader2, BookOpen, ChevronDown
} from 'lucide-react'; 

import { 
    type Session, 
    addSession, 
    deleteSession, 
    updateSession 
} from '../../services/firebase'; 
import { useCourseSessions } from '../../hooks/useCourseSessions'; 
import SessionNode from './SessionNode'; // Import component Node mới

interface SessionManagerFormProps {
    courseId: string;
    courseTitle: string;
    onClose: () => void;
    onSessionSelected: (sessionId: string, sessionTitle: string) => void;
    selectedSessionId: string | null; 
}

// Hàm chuyển danh sách phẳng thành cấu trúc cây
const buildSessionTree = (sessions: Session[]): (Session & { children: any[] })[] => {
    // 1. Sắp xếp sessions theo orderIndex
    const sortedSessions = sessions.sort((a, b) => a.orderIndex - b.orderIndex);
    
    // 2. Map để truy cập nhanh bằng ID và thêm trường children
    const sessionMap: { [key: string]: Session & { children: any[] } } = {};
    sortedSessions.forEach(session => {
        sessionMap[session.id] = { ...session, children: [] };
    });

    const tree: (Session & { children: any[] })[] = [];

    // 3. Xây dựng cây
    sortedSessions.forEach(session => {
        const node = sessionMap[session.id];
        
        // Kiểm tra parentId. Giả định session.parentId là string|null
        if (session.parentId && sessionMap[session.parentId]) {
            sessionMap[session.parentId].children.push(node);
        } else {
            // Session cấp 1 (root sessions)
            tree.push(node);
        }
    });

    return tree;
};


const SessionManagerForm: React.FC<SessionManagerFormProps> = ({ 
    courseId, 
    courseTitle, 
    onClose, 
    onSessionSelected,
    selectedSessionId,
}) => {
    const sessions = useCourseSessions(courseId); 
    
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sử dụng useMemo để tính toán cấu trúc cây mỗi khi sessions thay đổi
    const sessionTree = useMemo(() => {
        if (!sessions) return [];
        return buildSessionTree(sessions);
    }, [sessions]);


    /**
     * LOGIC THỰC HIỆN THÊM SESSION VÀO FIREBASE
     * @returns {Promise<boolean>} Trả về true nếu thành công, false nếu thất bại.
     */
    const addSessionToFirebase = async (parentId: string | null, title: string, orderIndex: number): Promise<boolean> => {
        if (!title.trim()) return false;
        
        setLoading(true);
        setError(null);

        try {
            await addSession(courseId, title.trim(), orderIndex, parentId);
            return true; // Thành công
        } catch (err) {
            setError("Lỗi khi tạo Session: Hãy kiểm tra kết nối và quyền hạn.");
            console.error(err);
            return false; // Thất bại
        } finally {
            setLoading(false);
        }
    }
    
    /**
     * Xử lý tạo Session cấp 1 (Gốc)
     */
    const handleAddRootSession = async (e: FormEvent) => {
        e.preventDefault();
        
        const currentRootCount = sessionTree.length;
        // Sử dụng hàm mới và nhận giá trị boolean để xử lý form
        const success = await addSessionToFirebase(null, newSessionTitle, currentRootCount);
        
        if (success) {
            setNewSessionTitle('');
        }
    };
    
    /**
     * Xử lý tạo Session Con (Truyền xuống SessionNode)
     * Đây là hàm được FIX: Nó phải trả về Promise<void>
     */
    const handleAddChildSession = async (parentId: string, title: string, orderIndex: number) => {
        // Gọi hàm thực hiện, nhưng không cần return giá trị boolean ra ngoài.
        // SessionNode chỉ cần biết hàm đã chạy xong (resolve) hoặc bị lỗi (reject).
        
        // Bọc logic vào try/catch để không làm treo SessionNode nếu có lỗi
        // và đảm bảo nó trả về Promise<void> nếu thành công.
        
        setLoading(true);
        setError(null);

        try {
            // Sử dụng addSession trực tiếp hoặc addSessionToFirebase (và bỏ qua return value)
            await addSession(courseId, title.trim(), orderIndex, parentId);
        } catch (err) {
             setError("Lỗi khi tạo Session con: Hãy kiểm tra kết nối và quyền hạn.");
             console.error(err);
             throw err; // Vẫn nên throw lỗi để SessionNode biết thao tác thất bại
        } finally {
            setLoading(false);
        }
        
        // Không có return, nên hàm này trả về Promise<void> ✅ FIXED
    };


    /**
     * Xử lý xóa Session (Truyền xuống SessionNode)
     */
    const handleDeleteSession = async (sessionId: string) => {
        // Chỉ cần dùng hàm hiện có, logic của sessionNode đã gọi window.confirm
        setLoading(true);
        setError(null);

        try {
            await deleteSession(courseId, sessionId);
            
            if (sessionId === selectedSessionId) {
                onSessionSelected('', ''); 
            }
        } catch (err) {
            setError("Lỗi khi xóa Session: Hãy kiểm tra quyền hạn. (Kiểm tra log console)");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    /**
     * Xử lý cập nhật tiêu đề Session (Truyền xuống SessionNode)
     */
    const handleUpdateSession = async (sessionId: string, newTitle: string) => {
        if (!newTitle.trim()) return;

        setLoading(true);
        setError(null);
        try {
            await updateSession(courseId, sessionId, newTitle.trim());
            
            // Nếu là Session đang được chọn, cập nhật tiêu đề ở CreateVideoForm
            if (sessionId === selectedSessionId) {
                onSessionSelected(sessionId, newTitle.trim());
            }
        } catch (err) {
            setError("Lỗi khi cập nhật Session: Hãy kiểm tra kết nối.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-semibold text-indigo-700 flex items-center">
                        <BookOpen size={24} className='mr-2'/> Quản lý Session: **{courseTitle}**
                    </h3>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form tạo Session CẤP 1 mới */}
                <form onSubmit={handleAddRootSession} className="p-6 border-b bg-gray-50">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Nhập tiêu đề Session cấp 1 (Root Session) mới..."
                            value={newSessionTitle}
                            onChange={(e) => setNewSessionTitle(e.target.value)}
                            className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                            disabled={loading}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading || !newSessionTitle.trim()}
                            className={`px-4 py-2 text-white font-medium rounded-md shadow-sm transition flex items-center ${
                                loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-1" />
                            ) : (
                                <Plus className="w-5 h-5 mr-1" />
                            )}
                            Thêm Gốc
                        </button>
                    </div>
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </form>

                {/* Danh sách Sessions (Dạng cây) */}
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {sessions === undefined && <p className="text-center text-gray-500">Đang tải Sessions...</p>}
                    
                    {sessionTree.length === 0 && sessions !== undefined && (
                        <p className="text-center text-gray-500">Chưa có Session nào. Hãy tạo Session cấp 1 đầu tiên.</p>
                    )}

                    {/* Hiển thị Session Root (Cấp 1) */}
                    {sessionTree.map((session) => (
                        <SessionNode 
                            key={session.id}
                            courseId={courseId}
                            session={session}
                            level={0} // Cấp độ 0 (Root)
                            loading={loading}
                            selectedSessionId={selectedSessionId}
                            onSessionSelected={onSessionSelected}
                            onDelete={handleDeleteSession}
                            onUpdate={handleUpdateSession}
                            onAddChild={handleAddChildSession}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t sticky bottom-0 bg-white">
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="w-full py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-medium"
                    >
                        Hoàn thành và Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionManagerForm;