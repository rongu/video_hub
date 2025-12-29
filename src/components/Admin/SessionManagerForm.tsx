import React, { useState, useMemo, type FormEvent, useCallback } from 'react';
import { X, Plus, Loader2, BookOpen, Layers } from 'lucide-react'; 
import { type Session, addSession, deleteSession, updateSession } from '../../services/firebase'; 
import useCourseSessions from '../../hooks/useCourseSessions';
import SessionNode from './SessionNode';

interface SessionManagerFormProps {
    courseId: string;
    courseTitle: string;
    onClose: () => void;
    // Callback này sẽ trả về Session ID và Title khi user chọn
    onSessionSelected: (sessionId: string, sessionTitle: string) => void;
    selectedSessionId: string | null; 
}

// ... (Giữ nguyên phần helper buildSessionTree ở đây) ...
interface SessionNodeStructure extends Session { children: SessionNodeStructure[]; videos?: any[]; }
const buildSessionTree = (sessions: Session[]): SessionNodeStructure[] => {
    const sessionMap: Map<string, SessionNodeStructure> = new Map();
    sessions.forEach(session => sessionMap.set(session.id, { ...session, children: [], videos: [] }));
    const tree: SessionNodeStructure[] = [];
    sessionMap.forEach(node => {
        if (node.parentId && sessionMap.has(node.parentId)) sessionMap.get(node.parentId)!.children.push(node);
        else tree.push(node);
    });
    const sortNodes = (nodes: SessionNodeStructure[]) => {
        nodes.sort((a, b) => a.orderIndex - b.orderIndex);
        nodes.forEach(node => { if (node.children.length > 0) sortNodes(node.children); });
    };
    sortNodes(tree);
    return tree;
};

const SessionManagerForm: React.FC<SessionManagerFormProps> = ({ 
    courseId, courseTitle, onClose, onSessionSelected, selectedSessionId,
}) => {
    const [sessions, isLoadingSessions, errorSessions] = useCourseSessions(courseId); 
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionTree = useMemo(() => buildSessionTree(sessions), [sessions]);

    // ... (Giữ nguyên các hàm CRUD: handleAddRootSession, handleAddChildSession, handleDeleteSession, handleUpdateSession) ...
    const handleAddRootSession = async (e: FormEvent) => {
        e.preventDefault(); if (!newSessionTitle.trim()) return;
        setLoading(true); setError(null);
        try {
            const currentRootCount = sessions.filter(s => s.parentId === null).length;
            await addSession(courseId, newSessionTitle.trim(), currentRootCount, null);
            setNewSessionTitle('');
        } catch (err) { setError("Lỗi tạo Session gốc."); } finally { setLoading(false); }
    };
    const handleAddChildSession = useCallback(async (parentId: string, title: string, orderIndex: number) => {
        setLoading(true); try { await addSession(courseId, title.trim(), orderIndex, parentId); } catch (err) { setError("Lỗi tạo Session con."); } finally { setLoading(false); }
    }, [courseId]);
    const handleDeleteSession = useCallback(async (sessionId: string) => {
        setLoading(true); try { await deleteSession(courseId, sessionId); if (sessionId === selectedSessionId) onSessionSelected('', ''); } catch (err) { setError("Lỗi xóa Session."); } finally { setLoading(false); }
    }, [courseId, selectedSessionId, onSessionSelected]);
    const handleUpdateSession = useCallback(async (sessionId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        setLoading(true); try { await updateSession(courseId, sessionId, newTitle.trim()); if (sessionId === selectedSessionId) onSessionSelected(sessionId, newTitle.trim()); } catch (err) { setError("Lỗi cập nhật Session."); } finally { setLoading(false); }
    }, [courseId, selectedSessionId, onSessionSelected]);

    // RENDER THUẦN TÚY (Không Portal nữa, vì AdminDashboard sẽ bọc nó)
    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-gray-800 flex items-center uppercase tracking-tight">
                            <Layers className='mr-3 text-indigo-600' size={28}/> Quản lý Session
                        </h3>
                        <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">Khóa học: <span className="text-indigo-600 font-bold">{courseTitle}</span></p>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body: Form tạo & List */}
                <div className="p-6 bg-white border-b border-gray-100 flex-shrink-0">
                    <form onSubmit={handleAddRootSession} className="flex gap-4 items-center w-full">
                         <div className="flex-grow relative">
                            <input type="text" placeholder="Nhập tên Session gốc..." value={newSessionTitle} onChange={(e) => setNewSessionTitle(e.target.value)} className="w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition font-medium" disabled={loading} autoFocus />
                        </div>
                        <button type="submit" disabled={loading || !newSessionTitle.trim()} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center whitespace-nowrap">
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Plus className="mr-2"/>} Tạo Session
                        </button>
                    </form>
                    {(error || errorSessions) && <p className="mt-3 text-red-500 font-bold">{error || errorSessions}</p>}
                </div>

                <div className="flex-grow overflow-y-auto bg-gray-50 p-6 custom-scrollbar">
                    {sessionTree.length === 0 && !isLoadingSessions ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60"><BookOpen size={64} className="mb-4"/><p>Chưa có Session nào.</p></div>
                    ) : (
                        <div className="w-full space-y-4 pb-20">
                            {sessionTree.map((session) => (
                                <SessionNode key={session.id} courseId={courseId} session={session} level={0} loading={loading} selectedSessionId={selectedSessionId} onSessionSelected={onSessionSelected} onDelete={handleDeleteSession} onUpdate={handleUpdateSession} onAddChild={handleAddChildSession} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end items-center flex-shrink-0">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg">Đóng</button>
                </div>
            </div>
        </div>
    );
};

export default SessionManagerForm;