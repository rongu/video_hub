import React, { useEffect, useState, useCallback, useMemo } from 'react';
// Giả định: kiểu Video đã có sessionId: string và deleteVideo/subscribeToVideos đã được cập nhật
import { type Video, type Session, subscribeToVideos, deleteVideo, updateVideo } from '../../services/firebase';
import { Loader2, FolderOpen, ChevronRight, ChevronDown, Video as VideoIcon } from 'lucide-react'; 
import VideoListItem from '../common/VideoListItem'; 
import ConfirmDeleteModal from './ConfirmDeleteModal'; 

// =========================================================
// INTERFACE & CẤU TRÚC DỮ LIỆU CÂY (Giữ nguyên)
// =========================================================

// Cấu trúc cho một node trong cây nội dung
interface ContentNode extends Session {
    // ✅ THAY ĐỔI: isParent sẽ được xác định DỰA VÀO childrenSessions.length > 0
    childrenSessions: ContentNode[];
    videos: Video[];
}

interface VideoListProps {
    courseId: string;
    sessions: Session[]; 
    onVideoChanged?: () => void; 
}

// =========================================================
// HÀM XÂY DỰNG CẤU TRÚC CÂY (Đã sửa)
// =========================================================

/**
 * Xây dựng cấu trúc cây Session từ danh sách phẳng (flat list)
 * @param flatSessions Danh sách tất cả sessions
 * @returns Danh sách các Session gốc (root sessions, parentId === null)
 */
const buildSessionTree = (flatSessions: Session[]): ContentNode[] => {
    // 1. Tạo Map (Hash table) cho việc tra cứu nhanh
    const sessionMap: Map<string, ContentNode> = new Map();
    
    // Khởi tạo các node
    flatSessions.forEach(session => {
        sessionMap.set(session.id, {
            ...session,
            // ✅ XÓA: isParent: !session.parentId, vì bây giờ isParent được xác định động
            childrenSessions: [],
            videos: [],
        } as ContentNode); // Ép kiểu vì chúng ta đang bỏ isParent khỏi interface Session
    });

    const tree: ContentNode[] = [];

    // 2. Xây dựng cây
    sessionMap.forEach(node => {
        // Nếu có parentId, node này là con, gán nó vào childrenSessions của cha
        if (node.parentId && sessionMap.has(node.parentId)) {
            sessionMap.get(node.parentId)!.childrenSessions.push(node);
        } else {
            // Nếu không có parentId, đây là node gốc (Layer 1)
            tree.push(node);
        }
    });

    // 3. Hàm đệ quy để sắp xếp Sessions ở mọi cấp độ
    const sortNodes = (nodes: ContentNode[]) => {
        nodes.sort((a, b) => a.orderIndex - b.orderIndex);
        nodes.forEach(node => {
            if (node.childrenSessions.length > 0) {
                sortNodes(node.childrenSessions);
            }
        });
    };
    sortNodes(tree);

    return tree;
};


// =========================================================
// COMPONENT CHÍNH: VideoList (Giữ nguyên logic ngoài)
// =========================================================
const VideoList: React.FC<VideoListProps> = ({ courseId, sessions, onVideoChanged }) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [openSessions, setOpenSessions] = useState<Set<string>>(new Set()); 
    
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    // ... (Lắng nghe Videos giữ nguyên) ...
    useEffect(() => {
        setLoading(true);
        setError(null);
        let unsubscribe = () => {};
        
        try {
            unsubscribe = (subscribeToVideos as (courseId: string, sessionId: null, callback: (v: Video[]) => void) => () => void)(courseId, null, (fetchedVideos) => {
                setVideos(fetchedVideos.sort((a, b) => b.createdAt - a.createdAt)); 
                setLoading(false);
            });
        } catch (e) {
            console.error("Lỗi khi lắng nghe Videos:", e);
            setError("Lỗi khi tải danh sách video.");
            setLoading(false);
        }
        return () => unsubscribe();
    }, [courseId]); 

    // ---------------------------------------------------------
    // 2. Xây dựng Cấu trúc Cây và Nhóm Videos (Đã sửa logic nhóm)
    // ---------------------------------------------------------
    const sessionTree = useMemo(() => {
        const tree = buildSessionTree(sessions);
        
        // Tạo map cho tất cả Session Con (Session không có con) để nhóm videos nhanh
        const sessionNodeMap: Map<string, ContentNode> = new Map();
        
        // Hàm đệ quy để thu thập tất cả nodes không phải là cha (chứa videos)
        const collectLeafNodes = (nodes: ContentNode[]) => {
            nodes.forEach(node => {
                if (node.childrenSessions.length === 0) {
                    sessionNodeMap.set(node.id, node);
                } else {
                    collectLeafNodes(node.childrenSessions);
                }
            });
        };
        collectLeafNodes(tree);

        videos.forEach(video => {
            const sessionNode = sessionNodeMap.get(video.sessionId);
            if (sessionNode) {
                // Chỉ thêm video vào session con không có con (Leaf Session)
                sessionNode.videos.push(video);
            } else {
                // Log cảnh báo nếu video thuộc về một session không tồn tại hoặc là session cha
                // console.warn(`Video ID ${video.id} thuộc Session ID ${video.sessionId} không tồn tại hoặc là Session Cha.`);
            }
        });
        
        return tree;
    }, [sessions, videos]);
    
    // ... (Hàm xử lý Edit/Delete/View giữ nguyên) ...
    const handleEditVideo = useCallback(async (videoId: string, newTitle: string) => { /* ... */ }, [courseId, onVideoChanged]);
    const handleDeleteClick = useCallback((video: Video) => { setVideoToDelete(video); }, []); 
    const handleConfirmDelete = async () => { /* ... */ };
    const handleViewVideo = useCallback(() => { /* ... */ }, []);


    if (loading) {
        // ... (Render Loading) ...
    }
    
    if (sessions.length === 0) {
        // ... (Render No Sessions) ...
    }
    
    // =========================================================
    // HÀM RENDER RECURSIVE (Đã sửa logic render)
    // =========================================================

    // Component con để render Sessions và Videos lồng nhau
    const SessionNodeRenderer = ({ node }: { node: ContentNode }) => {
        const isOpen = openSessions.has(node.id);
        const hasChildren = node.childrenSessions.length > 0;
        
        // Lấy tổng số video: 
        // Nếu là Session cha (có con), đệ quy tính tổng video của tất cả Sessions con
        // Nếu là Session lá (không có con), lấy trực tiếp từ node.videos.length
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
            <div className={`border rounded-lg overflow-hidden ${isParentNode ? 'shadow-md border-gray-200' : 'border-gray-100'}`}>
                
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
    // RENDER CHÍNH (Giữ nguyên)
    // =========================================================

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