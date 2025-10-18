import React from 'react';
import { type Course } from '../../services/firebase';
import { BookOpen, Video } from 'lucide-react';

interface CourseListItemProps {
    course: Course;
    // Tạm thời để trống. Sẽ được điền logic sau ở Level 4.2
    onViewCourse: (course: Course) => void;
}

const CourseListItem: React.FC<CourseListItemProps> = ({ course, onViewCourse }) => {
    return (
        <div 
            className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-t-4 border-indigo-500"
            onClick={() => onViewCourse(course)}
        >
            <div className="p-6">
                {/* Tiêu đề Khóa học */}
                <h3 className="text-xl font-bold text-gray-800 mb-2 truncate" title={course.title}>
                    <BookOpen className="inline h-5 w-5 text-indigo-600 mr-2" />
                    {course.title}
                </h3>
                
                {/* Mô tả ngắn */}
                <p className="text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                </p>

                <div className="flex items-center justify-between border-t pt-4">
                    {/* Số lượng Video */}
                    <div className="flex items-center text-sm font-semibold text-indigo-700">
                        <Video className="h-4 w-4 mr-1" />
                        {course.videoCount} bài học
                    </div>

                    {/* Nút Xem chi tiết */}
                    <button
                        className="py-1 px-4 text-sm font-semibold rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition duration-150 shadow-md"
                        aria-label={`Xem chi tiết khóa học ${course.title}`}
                        onClick={(e) => {
                            e.stopPropagation(); // Ngăn chặn sự kiện click lan truyền lên div cha
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
