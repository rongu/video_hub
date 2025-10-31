import React, { useState, type FormEvent } from 'react';
// SỬA LỖI: Thay thế heroicons bằng lucide-react
import { 
    X, // Đóng (Close)
    Plus, // Thêm (Plus)
    Trash2, // Xóa (Trash)
    CheckCircle, // Đã chọn (Check)
    Pencil, // Chỉnh sửa (Edit)
    Loader2, // Tải/Đang xử lý (Loading)
} from 'lucide-react'; 

// Đảm bảo import đúng các hàm và interface từ firebase.ts
import { 
    type Session, 
    addSession, 
    deleteSession, 
    updateSession 
} from '../../services/firebase'; 
import { useCourseSessions } from '../../hooks/useCourseSessions'; // Hook từ Bước 2

interface SessionManagerFormProps {
    courseId: string;
    courseTitle: string;
    onClose: () => void;
    /** Callback khi người dùng chọn/cập nhật Session để áp dụng vào CreateVideoForm */
    onSessionSelected: (sessionId: string, sessionTitle: string) => void;
    /** SessionId hiện tại đang được chọn (từ CreateVideoForm) */
    selectedSessionId: string | null; 
}

const SessionManagerForm: React.FC<SessionManagerFormProps> = ({ 
    courseId, 
    courseTitle, 
    onClose, 
    onSessionSelected,
    selectedSessionId,
}) => {
    // Lấy sessions real-time bằng Hook đơn giản
    const sessions = useCourseSessions(courseId); 
    
    // State cho việc tạo Session mới
    const [newSessionTitle, setNewSessionTitle] = useState('');
    
    // State quản lý UI và lỗi
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State cho việc chỉnh sửa inline
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    /**
     * Xử lý tạo Session mới (Gọi hàm Firebase trực tiếp)
     */
    const handleAddSession = async (e: FormEvent) => {
        e.preventDefault();
        // Kiểm tra sessions để lấy count chính xác
        if (!newSessionTitle.trim() || sessions === undefined) return;
        
        setLoading(true);
        setError(null);

        try {
            // Sessions đã được tải, lấy độ dài (index sẽ là length + 1)
            const currentSessionCount = sessions.length; 
            await addSession(courseId, newSessionTitle.trim(), currentSessionCount);
            setNewSessionTitle('');
        } catch (err) {
            setError("Lỗi khi tạo Session: Hãy kiểm tra kết nối và quyền hạn.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Xử lý xóa Session (Gọi hàm Firebase trực tiếp)
     */
    const handleDeleteSession = async (sessionId: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa Session này? TẤT CẢ video liên quan (videoCount) cũng sẽ bị xóa.")) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Hàm deleteSession sẽ xóa session doc, video sub-collection (có field sessionId đó) và cập nhật Course.videoCount
            await deleteSession(courseId, sessionId);
            
            // Nếu session đang được chọn bị xóa, hãy reset selection
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
     * Xử lý cập nhật tiêu đề Session (Gọi hàm Firebase trực tiếp)
     */
    const handleUpdateSession = async (sessionId: string) => {
        // Thoát nếu tiêu đề rỗng hoặc không thay đổi
        if (!editingTitle.trim()) {
            setEditingId(null);
            return;
        }

        const currentSession = sessions?.find(s => s.id === sessionId);
        if (currentSession && currentSession.title === editingTitle.trim()) {
            setEditingId(null); // Không thay đổi gì
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await updateSession(courseId, sessionId, editingTitle.trim());
            setEditingId(null);
            
            // Nếu đây là Session đang được chọn, cập nhật tiêu đề ở CreateVideoForm
            if (sessionId === selectedSessionId) {
                onSessionSelected(sessionId, editingTitle.trim());
            }
        } catch (err) {
            setError("Lỗi khi cập nhật Session: Hãy kiểm tra kết nối.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Bắt đầu chế độ chỉnh sửa
     */
    const startEditing = (session: Session) => {
        setEditingId(session.id);
        setEditingTitle(session.title);
    };


    return (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-semibold text-gray-900">
                        Quản lý Session ({courseTitle})
                    </h3>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form tạo Session mới */}
                <form onSubmit={handleAddSession} className="p-6 border-b">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Nhập tiêu đề Session mới..."
                            value={newSessionTitle}
                            onChange={(e) => setNewSessionTitle(e.target.value)}
                            className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                             Thêm
                        </button>
                    </div>
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </form>

                {/* Danh sách Sessions */}
                <div className="flex-grow overflow-y-auto p-6 space-y-3">
                    {sessions === undefined && <p className="text-center text-gray-500">Đang tải Sessions...</p>}
                    
                    {sessions && sessions.length === 0 && (
                        <p className="text-center text-gray-500">Chưa có Session nào. Hãy tạo Session đầu tiên.</p>
                    )}

                    {sessions?.map((session) => (
                        <div 
                            key={session.id} 
                            className={`flex items-center p-3 rounded-lg border transition ${
                                session.id === selectedSessionId 
                                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                                    : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            
                            {editingId === session.id ? (
                                // Chế độ chỉnh sửa (Input)
                                <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    // Blur (mất focus) hoặc Enter sẽ trigger update
                                    onBlur={() => handleUpdateSession(session.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleUpdateSession(session.id);
                                        }
                                    }}
                                    className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-1"
                                    autoFocus
                                    disabled={loading}
                                />
                            ) : (
                                // Chế độ xem (Display)
                                <div 
                                    className="flex-grow cursor-pointer flex items-center"
                                >
                                    <span className="font-semibold text-gray-800">
                                        {session.orderIndex}. {session.title}
                                    </span>
                                    <span className="text-sm text-gray-500 ml-3">({session.videoCount} video)</span>
                                </div>
                            )}

                            {/* Các nút hành động */}
                            <div className="flex space-x-2 ml-4 items-center">
                                {/* Nút Edit/Save (Chỉ hiện khi không ở chế độ chỉnh sửa) */}
                                {editingId !== session.id && (
                                    <button
                                        onClick={() => startEditing(session)}
                                        disabled={loading}
                                        className="p-1 text-gray-400 hover:text-indigo-600 transition"
                                        title="Chỉnh sửa tiêu đề"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                )}
                                

                                {session.id === selectedSessionId ? (
                                    // Nút Đã chọn
                                    <span className="text-green-600 flex items-center text-sm font-medium whitespace-nowrap">
                                        <CheckCircle className="w-5 h-5 mr-1" /> Đã chọn
                                    </span>
                                ) : (
                                    // Nút Chọn
                                    <button
                                        onClick={() => onSessionSelected(session.id, session.title)}
                                        disabled={loading}
                                        className="text-sm px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition whitespace-nowrap"
                                    >
                                        Chọn
                                    </button>
                                )}
                                
                                {/* Nút Xóa */}
                                <button
                                    onClick={() => handleDeleteSession(session.id)}
                                    disabled={loading}
                                    className="p-1 text-gray-400 hover:text-red-500 transition"
                                    title="Xóa Session và TẤT CẢ Video liên quan"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t sticky bottom-0 bg-white">
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="w-full py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-medium"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionManagerForm;