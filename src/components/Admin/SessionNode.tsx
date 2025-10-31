import React, { useState, type FormEvent, type ReactNode } from 'react';
import { 
    X, Plus, Trash2, CheckCircle, Pencil, Loader2, ChevronRight, ChevronDown, BookOpen, Film, Folder
} from 'lucide-react';
import { type Session, addSession, deleteSession, updateSession } from '../../services/firebase'; 

// Props cho SessionNode
interface SessionNodeProps {
    courseId: string;
    session: Session & { children: SessionNodeProps['session'][] }; // Session có thêm mảng children
    level: number;
    loading: boolean;
    selectedSessionId: string | null;
    onSessionSelected: (sessionId: string, sessionTitle: string) => void;
    onDelete: (sessionId: string) => Promise<void>;
    onUpdate: (sessionId: string, newTitle: string) => Promise<void>;
    onAddChild: (parentId: string, title: string, orderIndex: number) => Promise<void>;
}

const SessionNode: React.FC<SessionNodeProps> = ({
    courseId,
    session,
    level,
    loading,
    selectedSessionId,
    onSessionSelected,
    onDelete,
    onUpdate,
    onAddChild,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [newChildTitle, setNewChildTitle] = useState('');
    
    // State cho chỉnh sửa
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState(session.title);

    // Xử lý tạo Session con mới
    const handleAddChild = async (e: FormEvent) => {
        e.preventDefault();
        if (!newChildTitle.trim()) return;

        const currentChildCount = session.children.length; 
        
        await onAddChild(session.id, newChildTitle.trim(), currentChildCount);
        setNewChildTitle('');
        setIsAddingChild(false);
        setIsExpanded(true); // Mở rộng nút cha sau khi thêm con
    };

    // Xử lý cập nhật inline
    const handleUpdate = async () => {
        if (!editingTitle.trim() || editingTitle.trim() === session.title) {
            setEditingId(null);
            return;
        }
        await onUpdate(session.id, editingTitle.trim());
        setEditingId(null);
    };
    
    // Xác định xem một session có được phép CHỌN để upload video hay không
    // Quy tắc: Chỉ Session LÁ (không có con) mới được chọn.
    // Session đã có videos (videoCount > 0) là session lá cuối cùng.
    const isSelectable = session.videoCount > 0 || session.children.length === 0;

    // Xác định xem một session có được phép THÊM con hay không
    // Quy tắc: Session đã có videos (videoCount > 0) không được phép có session con.
    const canAddChild = session.videoCount === 0;

    const Icon = level === 0 ? BookOpen : Folder;
    
    // Đảm bảo padding-left
    const paddingLeft = `${(level + 0.5) * 1.5}rem`; 

    return (
        <div className="relative">
            {/* Nút Session hiện tại */}
            <div 
                className={`flex items-center p-3 rounded-lg border transition space-x-2 w-full ${
                    session.id === selectedSessionId 
                        ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                        : 'border-gray-200 hover:bg-gray-50'
                }`}
                style={{ paddingLeft }}
            >
                {/* Toggle Expand */}
                <button 
                    onClick={() => setIsExpanded(!isExpanded)} 
                    disabled={session.children.length === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-0"
                    title={isExpanded ? "Thu gọn" : "Mở rộng"}
                >
                    {session.children.length > 0 ? (isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />) : <Icon size={20} className="text-gray-500"/>}
                </button>

                <div className="flex-grow cursor-pointer flex items-center">
                    {editingId === session.id ? (
                        // Chế độ chỉnh sửa (Input)
                        <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={handleUpdate}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleUpdate();
                                }
                            }}
                            className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-1 text-sm"
                            autoFocus
                            disabled={loading}
                        />
                    ) : (
                        // Chế độ xem (Display)
                        <div className="flex items-center space-x-1">
                            {session.videoCount > 0 && <Film size={16} className="text-pink-500 mr-1"/>}
                            <span className="font-semibold text-gray-800 text-sm">
                                {session.title}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">({session.videoCount} video)</span>
                        </div>
                    )}
                </div>

                {/* Các nút hành động */}
                <div className="flex space-x-2 ml-4 items-center flex-shrink-0">
                    {/* Nút Thêm Session Con */}
                    {canAddChild && (
                        <button
                            onClick={() => setIsAddingChild(true)}
                            disabled={loading || isAddingChild}
                            className="p-1 text-gray-400 hover:text-green-600 transition"
                            title="Thêm Session con"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                    
                    {/* Nút Edit */}
                    {editingId !== session.id && (
                        <button
                            onClick={() => setEditingId(session.id)}
                            disabled={loading}
                            className="p-1 text-gray-400 hover:text-indigo-600 transition"
                            title="Chỉnh sửa tiêu đề"
                        >
                            <Pencil size={20} />
                        </button>
                    )}
                    
                    {/* Nút Chọn / Đã chọn */}
                    {isSelectable ? (
                        session.id === selectedSessionId ? (
                            <span className="text-green-600 flex items-center text-xs font-medium whitespace-nowrap">
                                <CheckCircle size={18} className="mr-1" /> Đã chọn
                            </span>
                        ) : (
                            <button
                                onClick={() => onSessionSelected(session.id, session.title)}
                                disabled={loading}
                                className="text-xs px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition whitespace-nowrap"
                            >
                                Chọn
                            </button>
                        )
                    ) : (
                        <span className="text-sm text-yellow-600 font-medium">Session Cha</span>
                    )}

                    {/* Nút Xóa */}
                    <button
                        onClick={() => onDelete(session.id)}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                        title="Xóa Session và Video liên quan"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Input thêm con */}
            {isAddingChild && (
                <form onSubmit={handleAddChild} className="mt-2 ml-4 flex space-x-2" style={{ paddingLeft }}>
                    <input
                        type="text"
                        placeholder={`Tiêu đề Session con của "${session.title}"...`}
                        value={newChildTitle}
                        onChange={(e) => setNewChildTitle(e.target.value)}
                        className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 text-sm"
                        autoFocus
                        required
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !newChildTitle.trim()}
                        className={`px-3 py-1 text-white text-sm font-medium rounded-md shadow-sm transition flex items-center ${
                            loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsAddingChild(false); setNewChildTitle(''); }}
                        className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                        disabled={loading}
                    >
                        <X size={16} />
                    </button>
                </form>
            )}

            {/* Hiển thị Sessions con (Đệ quy) */}
            {isExpanded && session.children.length > 0 && (
                <div className="ml-4 mt-2 space-y-2 border-l border-gray-200 pl-4">
                    {session.children.map((child) => (
                        <SessionNode 
                            key={child.id}
                            courseId={courseId}
                            session={child}
                            level={level + 1}
                            loading={loading}
                            selectedSessionId={selectedSessionId}
                            onSessionSelected={onSessionSelected}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            onAddChild={onAddChild}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SessionNode;