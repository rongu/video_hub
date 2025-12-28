import React, { useState, useCallback, useRef, useEffect } from 'react';
// ✅ BỔ SUNG CÁC ICON MỚI
import { PlayCircle, Edit2, Trash2, Save, X, Bookmark, FileText, HelpCircle } from 'lucide-react';
import { type Video} from '../../services/firebase'; 

interface VideoListItemProps {
    video: Video; 
    index: number;
    onEditVideo: (videoId: string, newTitle: string) => void;
    onDeleteVideo: (video: Video) => void; 
    onViewVideo: (video: Video) => void; 
    className?: string; 
}

const VideoListItem: React.FC<VideoListItemProps> = ({ video, index, onViewVideo, onEditVideo, onDeleteVideo, className = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newTitle, setNewTitle] = useState(video.title);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setNewTitle(video.title);
    }, [video.title]);

    const startEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    const cancelEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setNewTitle(video.title); 
        setIsEditing(false);
    }, [video.title]);
    
    const handleViewClick = useCallback(() => {
        if (!isEditing) {
            onViewVideo(video);
        }
    }, [isEditing, onViewVideo, video]);

    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); 
        
        if (newTitle === video.title || newTitle.trim() === '') {
            setIsEditing(false);
            return;
        }

        setLoading(true);
        try {
            await onEditVideo(video.id, newTitle); 
            setIsEditing(false);
        } catch (error) {
            console.error("Lỗi khi cập nhật tiêu đề:", error);
        } finally {
            setLoading(false);
        }
    }, [video.id, video.title, newTitle, onEditVideo]);

    const handleDeleteClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteVideo(video); 
    }, [video, onDeleteVideo]);

    // HÀM RENDER ICON THEO TYPE
    const renderTypeIcon = () => {
        if (video.type === 'quiz') return <HelpCircle className="flex-shrink-0 h-8 w-8 text-orange-500 ml-4 hover:text-orange-600 transition" />;
        if (video.type === 'text') return <FileText className="flex-shrink-0 h-8 w-8 text-blue-500 ml-4 hover:text-blue-600 transition" />;
        // Default video
        return <PlayCircle className="flex-shrink-0 h-8 w-8 text-green-500 ml-4 hover:text-green-600 transition" />;
    };

    if (isEditing) {
        return (
            <div className={`flex items-center p-4 bg-indigo-50 border-2 border-indigo-400 rounded-xl shadow-lg transition duration-300 ${className}`}>
                <div className="flex-shrink-0 w-8 text-lg font-bold text-indigo-600 mr-4 text-center">
                    #{index + 1}
                </div>
                
                <form onSubmit={handleSave} className="flex-grow flex items-center space-x-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-grow p-2 border border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition disabled:bg-gray-100"
                        disabled={loading}
                    />
                    
                    <button type="submit" disabled={loading} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition disabled:opacity-50"><Save size={18} /></button>
                    <button type="button" onClick={cancelEdit} disabled={loading} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition disabled:opacity-50"><X size={18} /></button>
                </form>
            </div>
        );
    }

    return (
        <div 
            onClick={handleViewClick}
            className={`flex items-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition duration-300 cursor-pointer border border-gray-100 hover:border-indigo-400 ${className}`}
        >
            <div className="flex-shrink-0 w-8 text-lg font-bold text-indigo-600 mr-4 text-center">
                #{index + 1}
            </div>
            <div className="flex-grow overflow-hidden">
                <div className="flex items-center space-x-2">
                     {/* Hiển thị tag loại nội dung */}
                     {video.type && video.type !== 'video' && (
                        <span className={`flex-shrink-0 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-white ${video.type === 'quiz' ? 'bg-orange-400' : 'bg-blue-400'}`}>
                            {video.type}
                        </span>
                    )}
                    <p className="text-gray-800 font-semibold truncate hover:text-indigo-600">{video.title}</p>
                </div>
                
                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                    <Bookmark size={14} className="text-indigo-400"/>
                    <span className="font-medium truncate">
                        ID: {video.sessionId}
                    </span>
                </div>
            </div>

            <div className="flex space-x-2 ml-4 flex-shrink-0">
                <button onClick={startEdit} className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-full transition"><Edit2 size={18} /></button>
                <button onClick={handleDeleteClick} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"><Trash2 size={18} /></button>
            </div>
            
            {renderTypeIcon()}
        </div>
    );
};

export default VideoListItem;