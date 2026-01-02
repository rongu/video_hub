import React, { useState, } from 'react';
import { type Session } from '../../services/firebase';
import { 
    Plus, Edit, Trash2, ChevronDown, ChevronRight, 
    BookOpen, Folder, X, CheckCircle, Save, 
    Loader2, ArrowUp, ArrowDown // [NEW] Icons
} from 'lucide-react'; 
import ConfirmDeleteModal from './ConfirmDeleteModal'; 

interface SessionNodeProps {
    session: Session & { children: SessionNodeProps['session'][] };
    courseId: string;
    level: number; 
    loading: boolean; 
    selectedSessionId: string | null;
    onSessionSelected: (sessionId: string, sessionTitle: string) => void;
    onDelete: (sessionId: string) => Promise<void>;
    onUpdate: (sessionId: string, newTitle: string) => Promise<void>;
    onAddChild: (parentId: string, title: string, orderIndex: number) => Promise<void>; 
    
    // [NEW] Props Move
    onMove: (session: Session, direction: 'up' | 'down') => Promise<void>;
    isFirst: boolean;
    isLast: boolean;
}

const SessionNode: React.FC<SessionNodeProps> = ({ 
    session, 
    courseId, 
    level, 
    loading, 
    selectedSessionId,
    onSessionSelected,
    onDelete,
    onUpdate,
    onAddChild,
    onMove,
    isFirst,
    isLast
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [newChildTitle, setNewChildTitle] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(session.title);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Logic nghiệp vụ cũ
    const isSelectable = session.videoCount > 0 || session.children.length === 0;
    const canAddChild = session.videoCount === 0;
    const IconComponent = level === 0 ? BookOpen : Folder;
    const isSelected = session.id === selectedSessionId;

    const handleUpdateSubmit = async () => {
        if (!editTitle.trim() || editTitle === session.title || loading) {
            setIsEditing(false);
            return;
        }
        try {
            await onUpdate(session.id, editTitle);
            setIsEditing(false);
        } catch (error) {
            console.error("Lỗi cập nhật tên Session:", error);
        }
    };

    const handleAddChildSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChildTitle.trim() || loading) return;
        try {
            await onAddChild(session.id, newChildTitle, session.children.length);
            setNewChildTitle('');
            setIsAddingChild(false);
            setIsExpanded(true); 
        } catch (error) {
             console.error("Lỗi thêm Session con:", error);
        }
    };

    const handleConfirmDelete = async () => {
        setShowDeleteModal(false);
        try {
            await onDelete(session.id);
        } catch (error) {
            console.error("Lỗi xóa Session:", error);
        }
    };

    const paddingLeft = `${level * 20}px`;

    return (
        <div className="space-y-1">
            <div 
                className={`flex items-center justify-between p-2.5 rounded-lg transition border ${
                    isSelected 
                        ? 'bg-indigo-100 border-indigo-400 shadow-sm' 
                        : 'bg-white hover:bg-gray-50 border-gray-100'
                }`}
                style={{ paddingLeft }}
            >
                <div className="flex items-center flex-grow overflow-hidden">
                    <div 
                        className="cursor-pointer p-1 text-gray-400 hover:text-indigo-600 transition" 
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {session.children.length > 0 ? (
                            isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>
                        ) : (
                            <div className="w-4" /> 
                        )}
                    </div>

                    {isEditing ? (
                        <div className="flex items-center space-x-2 flex-grow">
                            <input 
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={handleUpdateSubmit}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateSubmit()}
                                className="border-b-2 border-indigo-500 bg-transparent focus:outline-none text-sm font-bold w-full text-indigo-800"
                            />
                            <button onClick={handleUpdateSubmit} className="text-green-600 hover:text-green-700">
                                <Save size={18}/>
                            </button>
                        </div>
                    ) : (
                        <div 
                            className={`flex items-center flex-grow overflow-hidden ${isSelectable ? 'cursor-pointer' : 'cursor-default'}`}
                            onClick={() => isSelectable && onSessionSelected(session.id, session.title)}
                        >
                            <IconComponent 
                                size={18} 
                                className={`mr-2 flex-shrink-0 ${level === 0 ? 'text-indigo-600' : 'text-amber-500'}`} 
                            />
                            
                            <span className={`text-sm truncate ${isSelected ? 'font-bold text-indigo-700' : 'text-gray-700 font-medium'}`}>
                                {session.title}
                                {session.videoCount > 0 && (
                                    <span className="text-xs font-normal text-green-600 ml-2 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                        {session.videoCount} video
                                    </span>
                                )}
                            </span>
                            
                            {isSelected && <CheckCircle size={16} className="ml-2 text-indigo-600 flex-shrink-0" />}
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex items-center space-x-1 ml-2 opacity-60 hover:opacity-100 transition">
                        
                        {/* [NEW] Nút Move Up/Down */}
                        <div className="flex flex-col mr-2 border-r pr-2 border-gray-200">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onMove(session, 'up'); }} 
                                disabled={isFirst || loading}
                                className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                title="Lên trên"
                            >
                                <ArrowUp size={14}/>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onMove(session, 'down'); }} 
                                disabled={isLast || loading}
                                className="text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                title="Xuống dưới"
                            >
                                <ArrowDown size={14}/>
                            </button>
                        </div>

                        {canAddChild && (
                            <button 
                                onClick={() => setIsAddingChild(!isAddingChild)} 
                                className="text-green-600 p-1 hover:bg-green-50 rounded" 
                                title="Thêm chương con"
                            >
                                <Plus size={18}/>
                            </button>
                        )}
                        
                        <button 
                            onClick={() => setIsEditing(true)} 
                            className="text-blue-600 p-1 hover:bg-blue-50 rounded" 
                            title="Đổi tên"
                        >
                            <Edit size={18}/>
                        </button>
                        
                        <button 
                            onClick={() => setShowDeleteModal(true)} 
                            className="text-red-600 p-1 hover:bg-red-50 rounded" 
                            title="Xóa chương"
                        >
                            <Trash2 size={18}/>
                        </button>
                    </div>
                )}
            </div>

            {isAddingChild && (
                <form onSubmit={handleAddChildSubmit} className="flex items-center space-x-2 p-2 bg-indigo-50 rounded-lg" style={{ marginLeft: `calc(${paddingLeft} + 24px)` }}>
                    <input 
                        autoFocus
                        placeholder="Tên chương con mới..."
                        value={newChildTitle}
                        onChange={(e) => setNewChildTitle(e.target.value)}
                        className="flex-grow text-xs border border-indigo-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500"
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !newChildTitle.trim()} className="text-indigo-600 hover:text-indigo-800 disabled:text-gray-400">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>}
                    </button>
                    <button type="button" onClick={() => setIsAddingChild(false)}>
                        <X size={18} className="text-gray-400 hover:text-red-500"/>
                    </button>
                </form>
            )}

            {isExpanded && session.children.length > 0 && (
                <div className="space-y-1">
                    {session.children.map((child, index) => (
                        <SessionNode 
                            key={child.id}
                            {...{ 
                                session: child, 
                                courseId, 
                                level: level + 1, 
                                loading, 
                                selectedSessionId, 
                                onSessionSelected, 
                                onDelete, 
                                onUpdate, 
                                onAddChild,
                                onMove, // Pass down
                                isFirst: index === 0, // Pass index check
                                isLast: index === session.children.length - 1 // Pass index check
                            }}
                        />
                    ))}
                </div>
            )}

            {showDeleteModal && (
                <ConfirmDeleteModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleConfirmDelete}
                    title="Xác nhận xóa chương?"
                    description={`Bạn có chắc chắn muốn xóa chương "${session.title}"? Mọi nội dung bên trong cũng sẽ bị xóa bỏ.`}
                    isProcessing={loading}
                />
            )}
        </div>
    );
};

export default SessionNode;