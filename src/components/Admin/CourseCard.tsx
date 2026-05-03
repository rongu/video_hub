import { type Course, tr_h} from '../../services/firebase'; 
import { Video, Edit, Trash2 } from 'lucide-react';

interface CourseCardProps {
    course: Course;
    onManageVideos: (course: Course) => void;
    // Thêm các handlers mới cho Edit/Delete
    onEditCourse: (course: Course) => void;
    onDeleteCourse: (course: Course) => void;
    isSelected: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ 
    course, 
    onManageVideos, 
    onEditCourse, 
    onDeleteCourse, 
    isSelected 
}) => {
    // Hàm format ngày tháng
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'numeric', day: 'numeric' });
    };

    return (
        <div className={`argon-card flex flex-col overflow-hidden 
            ${isSelected ? 'border-4 border-[#1A73E8] ring-4 ring-blue-100' : ''}`}
        >
            <div className="p-5 flex-grow space-y-2">
                <h3 className="text-lg font-bold text-gray-700 line-clamp-2">{tr_h(course.title)}</h3>
                <p className="text-sm text-gray-600 line-clamp-3">{tr_h(course.description)}</p>
                <div className="text-xs text-gray-600 pt-2 border-t border-gray-200 mt-3">
                    Ngày tạo: {formatDate(course.createdAt)}
                </div>
            </div>
            <div className="bg-[#F8F9FA] p-3 flex space-x-2 border-t border-gray-200">
                <button
                    onClick={() => onManageVideos(course)}
                    className={`flex-1 flex items-center justify-center py-2 px-3 text-sm font-semibold rounded-lg transition duration-200 
                        ${isSelected ? 'text-white' : 'argon-button-gradient'}`}
                    style={isSelected ? {background: 'linear-gradient(195deg, #49A3F1, #1A73E8)'} : {}}
                >
                    <Video size={18} className="mr-1" /> 
                    {isSelected ? 'Đóng Quản lý' : 'Quản lý Video'}
                </button>
                
                <button
                    onClick={() => onEditCourse(course)}
                    className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition border border-amber-200"
                    title="Chỉnh sửa Khóa học"
                >
                    <Edit size={18} />
                </button>
                
                <button
                    onClick={() => onDeleteCourse(course)}
                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition border border-red-200"
                    title="Xóa Khóa học"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

export default CourseCard;
