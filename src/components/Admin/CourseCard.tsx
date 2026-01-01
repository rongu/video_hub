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
        <div className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 flex flex-col overflow-hidden 
            ${isSelected ? 'border-4 border-purple-500 ring-4 ring-purple-200' : 'border border-gray-100'}`}
        >
            <div className="p-5 flex-grow space-y-2">
                <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{tr_h(course.title)}</h3>
                <p className="text-sm text-gray-500 line-clamp-3">{tr_h(course.description)}</p>
                <div className="text-xs text-gray-400 pt-2 border-t mt-3">
                    Ngày tạo: {formatDate(course.createdAt)}
                </div>
            </div>
            <div className="bg-gray-50 p-3 flex space-x-2 border-t">
                {/* Nút Quản lý Video */}
                <button
                    onClick={() => onManageVideos(course)}
                    className={`flex-1 flex items-center justify-center py-2 px-3 text-sm font-semibold rounded-lg transition duration-200 
                        ${isSelected ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                >
                    <Video size={18} className="mr-1" /> 
                    {isSelected ? 'Đóng Quản lý' : 'Quản lý Video'}
                </button>
                
                {/* Nút Chỉnh sửa Khóa học */}
                <button
                    onClick={() => onEditCourse(course)}
                    className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition"
                    title="Chỉnh sửa Khóa học"
                >
                    <Edit size={18} />
                </button>
                
                {/* Nút Xóa Khóa học */}
                <button
                    onClick={() => onDeleteCourse(course)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    title="Xóa Khóa học"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

export default CourseCard;
