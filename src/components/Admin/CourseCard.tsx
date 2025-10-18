import React from 'react';
import { type Course } from '../../services/firebase';

interface CourseCardProps {
    course: Course;
    onManageVideos: (course: Course) => void;
    isSelected: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onManageVideos, isSelected }) => {
    return (
        <div 
            className={`p-4 bg-white border rounded-lg shadow-sm transition 
                ${isSelected ? 'border-purple-500 ring-4 ring-purple-100 shadow-lg' : 'border-gray-200 hover:shadow-md'}`}
        >
            <h4 className="text-lg font-semibold text-indigo-800">{course.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{course.description}</p>
            
            <div className="flex justify-between items-center mt-3 text-sm">
                <p className="text-xs text-gray-500 font-medium">
                    <span className="font-bold text-green-600">{course.videoCount}</span> Bài học
                </p>
                <button 
                    className={`py-1 px-3 text-xs font-semibold rounded-full transition 
                        ${isSelected ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                    onClick={() => onManageVideos(course)}
                >
                    {isSelected ? 'Đang Quản lý' : 'Quản lý Video'}
                </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 truncate">
                ID: {course.id}
            </p>
        </div>
    );
};

export default CourseCard;
