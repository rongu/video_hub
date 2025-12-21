import React, { useState, useMemo, type FormEvent, useCallback } from 'react';
import { 
    X, Plus, Trash2, CheckCircle, Pencil, Loader2, BookOpen, ChevronDown
} from 'lucide-react'; 

import { 
    type Session, 
    addSession, 
    deleteSession, 
    updateSession 
} from '../../services/firebase'; 
import useCourseSessions from '../../hooks/useCourseSessions'; // ✅ Hook đã được FIX
import SessionNode from './SessionNode'; // Component đã được FIX

interface SessionManagerFormProps {
    courseId: string;
    courseTitle: string;
    onClose: () => void;
    onSessionSelected: (sessionId: string, sessionTitle: string) => void;
    selectedSessionId: string | null; 
}

// =================================================================
// HÀM CHUYỂN DANH SÁCH PHẲNG THÀNH CẤU TRÚC CÂY
// =================================================================

// Định nghĩa Session Node (để khớp với SessionNode.tsx)
interface SessionNodeStructure extends Session { 
    children: SessionNodeStructure[]; 
    videos?: any[]; // Tạm thời
}

const buildSessionTree = (sessions: Session[]): SessionNodeStructure[] => {
    const sessionMap: Map<string, SessionNodeStructure> = new Map();
    
    // 1. Khởi tạo các node
    sessions.forEach(session => {
        sessionMap.set(session.id, { 
            ...session, 
            children: [], 
            videos: [], 
        });
    });

    const tree: SessionNodeStructure[] = [];

    // 2. Xây dựng cây và đẩy node gốc vào tree
    sessionMap.forEach(node => {
        if (node.parentId && sessionMap.has(node.parentId)) {
            // Gán node này vào children của cha
            sessionMap.get(node.parentId)!.children.push(node);
        } else {
            // Node gốc (Root)
            tree.push(node);
        }
    });

    // 3. Sắp xếp Sessions đệ quy theo orderIndex
    const sortNodes = (nodes: SessionNodeStructure[]) => {
        nodes.sort((a, b) => a.orderIndex - b.orderIndex);
        nodes.forEach(node => {
            if (node.children.length > 0) {
                sortNodes(node.children);
            }
        });
    };
    sortNodes(tree);

    return tree;
};


const SessionManagerForm: React.FC<SessionManagerFormProps> = ({ 
    courseId, 
    courseTitle, 
    onClose, 
    onSessionSelected,
    selectedSessionId,
}) => {
    // ✅ FIX: Giải cấu trúc hook đã sửa
    const [sessions, isLoadingSessions, errorSessions] = useCourseSessions(courseId); 
    
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [loading, setLoading] = useState(false); // Dùng cho CRUD
    const [error, setError] = useState<string | null>(null);

    // Sử dụng useMemo để tính toán cấu trúc cây mỗi khi sessions thay đổi
    const sessionTree = useMemo(() => {
        return buildSessionTree(sessions);
    }, [sessions]);


    // =================================================================
    // CÁC HÀM CRUD Sessions (Gộp logic)
    // =================================================================
    
    /**
     * Xử lý tạo Session cấp 1 (Gốc)
     */
    const handleAddRootSession = async (e: FormEvent) => {
        e.preventDefault();
        if (!newSessionTitle.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const currentRootCount = sessions.filter(s => s.parentId === null).length;
            await addSession(courseId, newSessionTitle.trim(), currentRootCount, null);
            setNewSessionTitle('');
        } catch (err) {
            setError("Lỗi khi tạo Session gốc: Hãy kiểm tra kết nối và quyền hạn.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    /**
     * Xử lý tạo Session Con (Được gọi từ SessionNode)
     */
    const handleAddChildSession = useCallback(async (parentId: string, title: string, orderIndex: number) => {
        setLoading(true);
        setError(null);
        
        try {
            // Logic thêm Session con
            await addSession(courseId, title.trim(), orderIndex, parentId);
        } catch (err) {
            setError("Lỗi khi tạo Session con.");
            console.error(err);
            throw err; // Vẫn throw để component con biết thao tác thất bại
        } finally {
            setLoading(false);
        }
    }, [courseId]);


    /**
     * Xử lý xóa Session (Được gọi từ SessionNode)
     */
    const handleDeleteSession = useCallback(async (sessionId: string) => {
        setLoading(true);
        setError(null);

        try {
            await deleteSession(courseId, sessionId);
            
            if (sessionId === selectedSessionId) {
                onSessionSelected('', ''); // Hủy chọn
            }
        } catch (err) {
            setError("Lỗi khi xóa Session.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [courseId, selectedSessionId, onSessionSelected]);
    
    /**
     * Xử lý cập nhật tiêu đề Session (Được gọi từ SessionNode)
     */
    const handleUpdateSession = useCallback(async (sessionId: string, newTitle: string) => {
        if (!newTitle.trim()) return;

        setLoading(true);
        setError(null);
        try {
            await updateSession(courseId, sessionId, newTitle.trim());
            
            if (sessionId === selectedSessionId) {
                onSessionSelected(sessionId, newTitle.trim());
            }
        } catch (err) {
            setError("Lỗi khi cập nhật Session.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [courseId, selectedSessionId, onSessionSelected]);


    return (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-semibold text-indigo-700 flex items-center">
                        <BookOpen size={24} className='mr-2'/> Quản lý Session: **{courseTitle}**
                    </h3>
                    <button onClick={onClose} disabled={loading || isLoadingSessions} className="text-gray-400 hover:text-gray-600 transition">
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
                            disabled={loading || isLoadingSessions}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading || isLoadingSessions || !newSessionTitle.trim()}
                            className={`px-4 py-2 text-white font-medium rounded-md shadow-sm transition flex items-center ${
                                loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {(loading || isLoadingSessions) ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-1" />
                            ) : (
                                <Plus className="w-5 h-5 mr-1" />
                            )}
                            Thêm Gốc
                        </button>
                    </div>
                    {(error || errorSessions) && <p className="mt-2 text-sm text-red-600">{error || errorSessions}</p>}
                </form>

                {/* Danh sách Sessions (Dạng cây) */}
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {sessionTree.length === 0 && !isLoadingSessions ? (
                        <p className="text-center text-gray-500">Chưa có Session nào. Hãy tạo Session cấp 1 đầu tiên.</p>
                    ) : (
                        sessionTree.map((session) => (
                            <SessionNode 
                                key={session.id}
                                courseId={courseId}
                                session={session}
                                level={0} // Cấp độ 0 (Root)
                                loading={loading || isLoadingSessions}
                                selectedSessionId={selectedSessionId}
                                onSessionSelected={onSessionSelected}
                                onDelete={handleDeleteSession}
                                onUpdate={handleUpdateSession}
                                onAddChild={handleAddChildSession}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t sticky bottom-0 bg-white">
                    <button 
                        onClick={onClose} 
                        disabled={loading || isLoadingSessions}
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