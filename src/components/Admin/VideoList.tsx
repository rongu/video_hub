import React, { useState, useCallback, useMemo } from 'react';
// Giả định: kiểu Video đã có sessionId: string và deleteVideo/subscribeToVideos đã được cập nhật
// ✅ CHỈ IMPORT CÁC HÀM CRUD (KHÔNG SUBSCRIBE)
import { type Video, type Session, deleteVideo, updateVideo } from '../../services/firebase';
import { FolderOpen, ChevronRight, ChevronDown, Video as VideoIcon} from 'lucide-react'; 
import VideoListItem from '../common/VideoListItem'; 
import ConfirmDeleteModal from './ConfirmDeleteModal'; 

// =========================================================
// INTERFACE & CẤU TRÚC DỮ LIỆU CÂY
// =========================================================

// Cấu trúc cho một node trong cây nội dung
interface ContentNode extends Session {
    childrenSessions: ContentNode[];
    videos: Video[];
}

interface VideoListProps {
    courseId: string;
    sessions: Session[]; 
    // ✅ THÊM PROP VIDEOS: Nhận tất cả videos đã được fetch từ AdminDashboard
    videos: Video[]; 
    onVideoChanged?: () => void; 
}

// =========================================================
// HÀM XÂY DỰNG CẤU TRÚC CÂY
// =========================================================

/**
 * Xây dựng cấu trúc cây Session từ danh sách phẳng (flat list) và GÁN videos
 * @param flatSessions Danh sách tất cả sessions (đã sắp xếp)
 * @param flatVideos Danh sách tất cả videos (đã sắp xếp)
 * @returns Danh sách các Session gốc (root sessions, parentId === null)
 */
const buildSessionTree = (flatSessions: Session[], flatVideos: Video[]): ContentNode[] => {
    const sessionMap: Map<string, ContentNode> = new Map();
    
    // 1. Khởi tạo và Map Sessions
    flatSessions.forEach(session => {
        sessionMap.set(session.id, {
            ...session,
            childrenSessions: [],
            videos: [],
        } as ContentNode);
    });

    // 2. Gán Videos vào Session tương ứng
    flatVideos.forEach(video => {
        const sessionNode = sessionMap.get(video.sessionId);
        if (sessionNode) {
            // Thêm video vào Session lá
            sessionNode.videos.push(video);
        }
    });

    const tree: ContentNode[] = [];

    // 3. Xây dựng cây và đẩy node gốc vào tree
    sessionMap.forEach(node => {
        if (node.parentId && sessionMap.has(node.parentId)) {
            // Gán node này vào childrenSessions của cha
            sessionMap.get(node.parentId)!.childrenSessions.push(node);
        } else {
            // Node gốc
            tree.push(node);
        }
    });

    // 4. Sắp xếp Sessions và Videos đệ quy (Client-side sorting)
    const sortNodes = (nodes: ContentNode[]) => {
        nodes.sort((a, b) => a.orderIndex - b.orderIndex);
        nodes.forEach(node => {
            // Sắp xếp Videos bên trong Session
            node.videos.sort((a, b) => a.createdAt - b.createdAt); 
            if (node.childrenSessions.length > 0) {
                sortNodes(node.childrenSessions);
            }
        });
    };
    sortNodes(tree);

    return tree;
};


// =========================================================
// COMPONENT CHÍNH: VideoList 
// =========================================================
const VideoList: React.FC<VideoListProps> = ({ courseId, sessions, videos, onVideoChanged }) => {
    // ✅ LOẠI BỎ loading và videos state (dùng props thay thế)
    // const [videos, setVideos] = useState<Video[]>([]);
    // const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [openSessions, setOpenSessions] = useState<Set<string>>(new Set()); 
    
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ✅ LẮNG NGHE VIDEOS BỊ LOẠI BỎ (Đã chuyển sang AdminDashboard)
    /*
    useEffect(() => {
        // ... (Logic subscribe bị loại bỏ) ...
    }, [courseId]); 
    */

    // Toggle trạng thái mở/đóng của một Session (Dùng cho mọi cấp)
    const toggleSession = useCallback((sessionId: string) => {
        setOpenSessions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sessionId)) {
                newSet.delete(sessionId);
            } else {
                newSet.add(sessionId);
            }
            return newSet;
        });
    }, []);

    // ---------------------------------------------------------
    // 2. Xây dựng Cấu trúc Cây và Nhóm Videos
    // ---------------------------------------------------------
    const sessionTree = useMemo(() => {
        // ✅ XÂY DỰNG CÂY TỪ PROPS SESSIONS VÀ VIDEOS
        return buildSessionTree(sessions, videos);
    }, [sessions, videos]);
    
    
    const handleEditVideo = useCallback(async (videoId: string, newTitle: string) => { 
        // Logic chỉnh sửa video 
        try {
            // Tìm video để lấy sessionId và cập nhật
            const videoToUpdate = videos.find(v => v.id === videoId);
            if (!videoToUpdate) return;
            
            await updateVideo(courseId, videoId, { title: newTitle });
            onVideoChanged?.();
        } catch(e) {
             setError("Lỗi cập nhật video.");
        }
    }, [courseId, videos, onVideoChanged]);

    const handleDeleteClick = useCallback((video: Video) => { setVideoToDelete(video); }, []); 
    
    const handleConfirmDelete = async () => {
        if (!videoToDelete) return;
        setIsDeleting(true);
        try {
            // Cần sessionId và storagePath để xóa
            // GỌI HÀM DELETE VIDEO (Đã có trong firebase.ts)
            await deleteVideo(courseId, videoToDelete.sessionId, videoToDelete.id, videoToDelete.storagePath || '');
            setVideoToDelete(null);
            onVideoChanged?.();
        } catch(e) {
            setError("Lỗi xóa video.");
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleViewVideo = useCallback(() => { /* Không cần implement logic view trong Admin */ }, []);


    if (sessions.length === 0) {
        return <p className='text-gray-500 italic'>Vui lòng tạo Session (Chương) trước khi thêm video.</p>;
    }
    
    // =========================================================
    // HÀM RENDER RECURSIVE
    // =========================================================

    // Component con để render Sessions và Videos lồng nhau
    const SessionNodeRenderer = ({ node }: { node: ContentNode }) => {
        const isOpen = openSessions.has(node.id);
        const hasChildren = node.childrenSessions.length > 0;
        
        // Lấy tổng số video: 
        const totalVideoCount = useMemo(() => {
            if (!hasChildren) return node.videos.length;
            
            // Hàm đệ quy để tính tổng video
            const countRecursive = (nodes: ContentNode[]): number => {
                return nodes.reduce((sum, child) => {
                    if (child.childrenSessions.length > 0) {
                        return sum + countRecursive(child.childrenSessions);
                    }
                    return sum + child.videos.length;
                }, 0);
            }
            return countRecursive(node.childrenSessions);
        }, [node, hasChildren]);


        // ✅ XÁC ĐỊNH LOẠI SESSION DỰA VÀO CÂY
        const isParentNode = hasChildren; // Bất kỳ node nào có Session con đều là ParentNode

        // Chỉ hiển thị icon toggle nếu có Session con HOẶC có Videos
        const showToggleIcon = isParentNode || totalVideoCount > 0; 
        
        const Icon = isOpen ? ChevronDown : ChevronRight;
        
        // ---------------------------------------------------------
        // 🟢 JSX cho Session
        // ---------------------------------------------------------
        return (
            <div key={node.id} className={`border rounded-lg overflow-hidden ${isParentNode ? 'shadow-md border-gray-200' : 'border-gray-100'}`}>
                
                {/* TIÊU ĐỀ SESSION (Clickable nếu có nội dung để mở) */}
                <div 
                    className={`p-3 flex items-center justify-between font-semibold transition ${
                        showToggleIcon 
                            ? (isParentNode ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer' : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer')
                            : 'bg-white text-gray-500' // Không có gì để mở, hiển thị mờ hơn
                    }`}
                    // ✅ Áp dụng toggleSession cho bất kỳ node nào có thể mở
                    onClick={() => showToggleIcon && toggleSession(node.id)}
                >
                    <span className={`flex items-center space-x-2 ${isParentNode ? 'font-bold' : 'font-medium'}`}>
                        {/* Icon Toggles (Chỉ hiển thị nếu có nội dung để toggle) */}
                        {showToggleIcon ? (
                            <Icon className="h-4 w-4 text-indigo-600" />
                        ) : (
                            // Giữ khoảng trống nếu không có toggle
                            <span className="h-4 w-4 mr-1"></span> 
                        )}
                        
                        {/* Icon Folder (Session chứa con) hoặc Video (Session chứa video) */}
                        {isParentNode ? (
                            <FolderOpen className="h-5 w-5 text-indigo-600" />
                        ) : (
                            <VideoIcon className="h-5 w-5 text-green-600" />
                        )}
                        
                        {/* Tiêu đề */}
                        <span>
                            {node.title} 
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                ({totalVideoCount} video)
                            </span>
                        </span>
                    </span>
                </div>

                {/* NỘI DUNG 1: DANH SÁCH SESSIONS CON (Chỉ hiển thị nếu là ParentNode) */}
                {isOpen && isParentNode && (
                    <div className="pt-2">
                        {node.childrenSessions.map(childNode => (
                            // ✅ GỌI ĐỆ QUY SessionNodeRenderer cho các Session con ở mọi cấp
                            <div key={childNode.id} className="pl-4"> 
                                <SessionNodeRenderer node={childNode} />
                            </div>
                        ))}
                    </div>
                )}
                
                {/* NỘI DUNG 2: DANH SÁCH VIDEO (Chỉ hiển thị nếu là Session lá và có video) */}
                {isOpen && !isParentNode && totalVideoCount > 0 && (
                    <div className="divide-y divide-gray-200">
                        {node.videos.map((video, index) => (
                            <VideoListItem 
                                key={video.id} 
                                video={video}
                                index={index}
                                onViewVideo={handleViewVideo}
                                onEditVideo={handleEditVideo}
                                onDeleteVideo={handleDeleteClick} 
                                className="pl-6 pr-2"
                            />
                        ))}
                    </div>
                )}
                
                {/* Thông báo nếu Session lá không có video */}
                 {isOpen && !isParentNode && totalVideoCount === 0 && (
                    <p className="text-gray-500 italic p-4 text-sm">Session này chưa có video nào.</p>
                )}
            </div>
        );
    };


    // =========================================================
    // RENDER CHÍNH (Sử dụng Loader)
    // =========================================================

    // ✅ Render Loader nếu sessions rỗng và videos rỗng (nhưng sessions phải được fetch)
    // Giả định sessions đã được fetch thành công ở AdminDashboard
    if (sessions.length === 0) {
        return <p className='text-gray-500 italic'>Vui lòng tạo Session (Chương) trước khi thêm video.</p>;
    }
    
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Nội dung Khóa học ({videos.length} video)</h3>
            
            {error && <p className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200">{error}</p>}

            <div className="space-y-4">
                {sessionTree.map(parentSession => (
                    // Chỉ render các Session Cha (root nodes)
                    <SessionNodeRenderer key={parentSession.id} node={parentSession} />
                ))}
            </div>

            {/* ... Modal xác nhận xóa (Giữ nguyên) ... */}
            <ConfirmDeleteModal 
                isOpen={!!videoToDelete}
                onClose={() => setVideoToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Xác nhận xóa Video: "${videoToDelete?.title || ''}"`}
                description={`Bạn có chắc chắn muốn xóa video này khỏi Session **${sessions.find(s => s.id === videoToDelete?.sessionId)?.title || 'Không rõ'}**? Thao tác này không thể hoàn tác.`}
                isProcessing={isDeleting}
            />
        </div>
    );
};

export default VideoList;