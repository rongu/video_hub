import React from 'react';
import { type Course, tr_h } from '../../services/firebase';
import { BookOpen, Video } from 'lucide-react';

interface CourseListItemProps {
    course: Course;
    onViewCourse: (course: Course) => void;
}

const CourseListItem: React.FC<CourseListItemProps> = ({ course, onViewCourse }) => {
    return (
        <div 
            className="argon-card cursor-pointer"
            onClick={() => onViewCourse(course)}
        >
            <div className="p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-2 truncate" title={tr_h(course.title)}>
                    <BookOpen className="inline h-5 w-5 text-[#1A73E8] mr-2" />
                    {tr_h(course.title)}
                </h3>
                
                <p className="text-gray-600 mb-4 line-clamp-2">
                    {tr_h(course.description)}
                </p>

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="flex items-center text-sm font-semibold text-[#1A73E8]">
                        <Video className="h-4 w-4 mr-1" />
                        {course.videoCount} bài học
                    </div>

                    <button
                        className="argon-button-gradient py-1 px-4 text-sm"
                        aria-label={`Xem chi tiết khóa học ${course.title}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewCourse(course);
                        }}
                    >
                        Xem Chi Tiết
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseListItem;
