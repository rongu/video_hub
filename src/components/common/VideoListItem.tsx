import React from 'react';
import { PlayCircle, Clock } from 'lucide-react';
import { type Video } from '../../services/firebase.ts';

interface VideoListItemProps {
    video: Video;
    index: number;
    onViewVideo: (video: Video) => void;
}

// Chuyển đổi thời lượng (giây) sang định dạng MM:SS
const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
};

const VideoListItem: React.FC<VideoListItemProps> = ({ video, index, onViewVideo }) => {
    return (
        <div 
            onClick={() => onViewVideo(video)}
            className="flex items-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition duration-300 cursor-pointer border border-gray-100 hover:border-indigo-400"
        >
            <div className="flex-shrink-0 w-8 text-lg font-bold text-indigo-600 mr-4 text-center">
                #{index + 1}
            </div>
            <div className="flex-grow">
                <p className="text-gray-800 font-semibold truncate hover:text-indigo-600">{video.title}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Clock className="h-4 w-4 mr-1"/>
                    <span>Thời lượng: {formatDuration(video.duration)}</span>
                </div>
            </div>
            <PlayCircle className="flex-shrink-0 h-8 w-8 text-green-500 ml-4 hover:text-green-600 transition" />
        </div>
    );
};

export default VideoListItem;