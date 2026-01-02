import React, { useState, useCallback, useMemo } from 'react';
import { type Video, type Session, deleteVideo, updateVideo } from '../../services/firebase';
import { FolderOpen, ChevronRight, ChevronDown, Video as VideoIcon} from 'lucide-react'; 
import VideoListItem from '../common/VideoListItem'; 
import ConfirmDeleteModal from './ConfirmDeleteModal'; 

interface ContentNode extends Session {
    childrenSessions: ContentNode[];
    videos: Video[];
}

interface VideoListProps {
    courseId: string;
    sessions: Session[]; 
    videos: Video[]; 
    onVideoChanged?: () => void;
    // Callback mở modal edit
    onEditVideoRequest?: (video: Video) => void;
}

const buildSessionTree = (flatSessions: Session[], flatVideos: Video[]): ContentNode[] => {
    const sessionMap: Map<string, ContentNode> = new Map();
    flatSessions.forEach(session => {
        sessionMap.set(session.id, { ...session, childrenSessions: [], videos: [] } as ContentNode);
    });
    flatVideos.forEach(video => {
        const sessionNode = sessionMap.get(video.sessionId);
        if (sessionNode) sessionNode.videos.push(video);
    });
    const tree: ContentNode[] = [];
    sessionMap.forEach(node => {
        if (node.parentId && sessionMap.has(node.parentId)) sessionMap.get(node.parentId)!.childrenSessions.push(node);
        else tree.push(node);
    });
    const sortNodes = (nodes: ContentNode[]) => {
        nodes.sort((a, b) => a.orderIndex - b.orderIndex);
        nodes.forEach(node => {
            node.videos.sort((a, b) => a.createdAt - b.createdAt); 
            if (node.childrenSessions.length > 0) sortNodes(node.childrenSessions);
        });
    };
    sortNodes(tree);
    return tree;
};

const VideoList: React.FC<VideoListProps> = ({ courseId, sessions, videos, onVideoChanged, onEditVideoRequest }) => {
    const [error, setError] = useState<string | null>(null);
    const [openSessions, setOpenSessions] = useState<Set<string>>(new Set()); 
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleSession = useCallback((sessionId: string) => {
        setOpenSessions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sessionId)) newSet.delete(sessionId);
            else newSet.add(sessionId);
            return newSet;
        });
    }, []);

    const sessionTree = useMemo(() => buildSessionTree(sessions, videos), [sessions, videos]);
    
    // Fallback handler cho inline edit (ít dùng nếu đã có onEditVideoRequest)
    const handleInlineEditVideo = useCallback(async (videoId: string, newTitle: string) => { 
        try {
             await updateVideo(courseId, videoId, { title: newTitle });
             onVideoChanged?.();
        } catch(e) { setError("Lỗi cập nhật video."); }
    }, [courseId, onVideoChanged]);

    const handleDeleteClick = useCallback((video: Video) => { setVideoToDelete(video); }, []); 
    
    const handleConfirmDelete = async () => {
        if (!videoToDelete) return;
        setIsDeleting(true);
        try {
            await deleteVideo(courseId, videoToDelete.sessionId, videoToDelete.id, videoToDelete.storagePath || '');
            setVideoToDelete(null);
            onVideoChanged?.();
        } catch(e) { setError("Lỗi xóa video."); } finally { setIsDeleting(false); }
    };

    const SessionNodeRenderer = ({ node }: { node: ContentNode }) => {
        const isOpen = openSessions.has(node.id);
        const hasChildren = node.childrenSessions.length > 0;
        const totalVideoCount = useMemo(() => {
            if (!hasChildren) return node.videos.length;
            const countRecursive = (nodes: ContentNode[]): number => {
                return nodes.reduce((sum, child) => {
                    if (child.childrenSessions.length > 0) return sum + countRecursive(child.childrenSessions);
                    return sum + child.videos.length;
                }, 0);
            }
            return countRecursive(node.childrenSessions);
        }, [node, hasChildren]);

        const isParentNode = hasChildren; 
        const showToggleIcon = isParentNode || totalVideoCount > 0; 
        const Icon = isOpen ? ChevronDown : ChevronRight;
        
        return (
            <div key={node.id} className={`border rounded-lg overflow-hidden ${isParentNode ? 'shadow-md border-gray-200' : 'border-gray-100'}`}>
                <div 
                    className={`p-3 flex items-center justify-between font-semibold transition ${
                        showToggleIcon ? (isParentNode ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer' : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer') : 'bg-white text-gray-500' 
                    }`}
                    onClick={() => showToggleIcon && toggleSession(node.id)}
                >
                    <span className={`flex items-center space-x-2 ${isParentNode ? 'font-bold' : 'font-medium'}`}>
                        {showToggleIcon ? <Icon className="h-4 w-4 text-indigo-600" /> : <span className="h-4 w-4 mr-1"></span>}
                        {isParentNode ? <FolderOpen className="h-5 w-5 text-indigo-600" /> : <VideoIcon className="h-5 w-5 text-green-600" />}
                        <span>{node.title} <span className="text-sm font-normal text-gray-500 ml-2">({totalVideoCount} video)</span></span>
                    </span>
                </div>
                {isOpen && isParentNode && (
                    <div className="pt-2">
                        {node.childrenSessions.map(childNode => <div key={childNode.id} className="pl-4"><SessionNodeRenderer node={childNode} /></div>)}
                    </div>
                )}
                {isOpen && !isParentNode && totalVideoCount > 0 && (
                    <div className="divide-y divide-gray-200">
                        {node.videos.map((video, index) => (
                            <VideoListItem 
                                key={video.id} 
                                video={video}
                                index={index}
                                onViewVideo={() => {}}
                                onEditVideo={handleInlineEditVideo} // Giữ lại cho tương thích (type check)
                                
                                // [NEW] Truyền handler để mở Modal Edit (sẽ override inline edit)
                                onEditStart={onEditVideoRequest} 
                                
                                onDeleteVideo={handleDeleteClick} 
                                className="pl-6 pr-2"
                            />
                        ))}
                    </div>
                )}
                 {isOpen && !isParentNode && totalVideoCount === 0 && (
                    <p className="text-gray-500 italic p-4 text-sm">Session này chưa có video nào.</p>
                )}
            </div>
        );
    };

    if (sessions.length === 0) return <p className='text-gray-500 italic'>Vui lòng tạo Session (Chương) trước khi thêm video.</p>;
    
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Nội dung Khóa học ({videos.length} video)</h3>
            {error && <p className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200">{error}</p>}
            <div className="space-y-4">
                {sessionTree.map(parentSession => <SessionNodeRenderer key={parentSession.id} node={parentSession} />)}
            </div>
            <ConfirmDeleteModal isOpen={!!videoToDelete} onClose={() => setVideoToDelete(null)} onConfirm={handleConfirmDelete} title={`Xác nhận xóa Video: "${videoToDelete?.title || ''}"`} description="Hành động này không thể hoàn tác." isProcessing={isDeleting} />
        </div>
    );
};
export default VideoList;