import React, { useState, useCallback } from 'react';
import { 
    addVideo, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    generateVideoId, 
    type Video,
    getFirebaseStorage
} from '../../services/firebase'; 
import { type User } from 'firebase/auth';
import { Loader2, X, UploadCloud, FileText } from 'lucide-react';

interface CreateVideoFormProps {
    courseId: string;
    courseTitle: string;
    adminUser: User;
    onVideoCreated: () => void;
    onClose: () => void;
}

const CreateVideoForm: React.FC<CreateVideoFormProps> = ({ courseId, courseTitle, adminUser, onVideoCreated, onClose }) => {
    const [title, setTitle] = useState('');
    // ĐÃ SỬA: Thay đổi từ File | null thành File[] để lưu danh sách tệp/folder
    const [files, setFiles] = useState<File[]>([]); 
    
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    // ĐÃ THÊM: Theo dõi tệp đang tải lên hiện tại (khi upload folder)
    const [currentFileIndex, setCurrentFileIndex] = useState(0); 

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ĐÃ SỬA: Xử lý nhiều tệp được chọn từ input (kể cả chọn thư mục)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Lọc các tệp không phải video
            const selectedFiles = Array.from(e.target.files).filter(f => f.type.startsWith('video/'));

            if (selectedFiles.length === 0) {
                setError('Vui lòng chọn ít nhất một tệp video hợp lệ.');
                setFiles([]);
                return;
            }
            
            setFiles(selectedFiles);
            setError('');
            setSuccess('');
        } else {
            setFiles([]);
        }
    };
    
    // Hàm tải lên một tệp, được giữ nguyên để gọi trong vòng lặp
    const uploadFile = async (videoFile: File, videoId: string): Promise<{ videoUrl: string, storagePath: string }> => {
        // Đường dẫn: artifacts/APP_ID_ROOT/videos/{courseId}/{videoId}/{videoName}
        // Giả định APP_ID_ROOT là 'video-hub-prod-id' như trong code cũ của bạn
        const filePath = `artifacts/video-hub-prod-id/videos/${courseId}/${videoId}/${videoFile.name}`;
        const storageRef = ref(getFirebaseStorage(), filePath);
        
        const uploadTask = uploadBytesResumable(storageRef, videoFile);

        return new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress)); 
                },
                (uploadError) => {
                    reject(uploadError);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({ videoUrl: downloadURL, storagePath: filePath });
                    } catch (urlError) {
                        reject(urlError);
                    }
                }
            );
        });
    };

    // ĐÃ SỬA: Cập nhật hàm handleSubmit để lặp qua mảng files và upload hàng loạt
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!title.trim()) {
            setError("Vui lòng nhập Tiêu đề Video.");
            return;
        }
        // Kiểm tra files array thay vì single file
        if (files.length === 0) {
            setError("Vui lòng chọn ít nhất một tệp video hoặc một thư mục.");
            return;
        }
        
        setUploading(true);
        setUploadProgress(0);
        setCurrentFileIndex(0); 
        let successCount = 0;

        try {
            // LẶP QUA TẤT CẢ CÁC FILES ĐƯỢC CHỌN
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                setCurrentFileIndex(i + 1); // Cập nhật index (bắt đầu từ 1)
                setUploadProgress(0); // Reset progress cho file mới
                
                // 1. Tạo ID duy nhất cho video (mỗi video mới có một ID)
                const videoId = generateVideoId(); 
                
                // 2. Tải file lên Firebase Storage
                const { videoUrl, storagePath } = await uploadFile(file, videoId);

                // 3. Chuẩn bị Tiêu đề cuối cùng
                const baseTitle = title.trim();
                // Lấy tên file/đường dẫn tương đối, loại bỏ đuôi mở rộng
                const fileContext = (file.webkitRelativePath || file.name).replace(/\.[^/.]+$/, "");

                // Nếu là upload folder (files.length > 1), nối Tiêu đề gốc với tên file
                const finalTitle = files.length > 1 
                    ? `${baseTitle} - ${fileContext}`
                    : baseTitle;
                
                // 4. Lưu dữ liệu vào Firestore
                await addVideo(
                    courseId, 
                    finalTitle, 
                    videoUrl, 
                    storagePath, 
                    adminUser.uid, 
                    videoId 
                );
                
                successCount++;
            }
            
            // Thành công
            setSuccess(`Đã tải lên và thêm thành công ${successCount} video vào khóa học!`);
            setTitle('');
            setFiles([]); // Reset files
            onVideoCreated(); 
            setTimeout(onClose, 2500); 
            
        } catch (err: any) {
            console.error("Lỗi khi tải hoặc tạo Video:", err);
            setError(`Tạo video thất bại (File ${currentFileIndex}/${files.length}). Lỗi: ${err.message || "Vui lòng kiểm tra kết nối mạng và quy tắc Storage/Firestore."}`);
        } finally {
            setUploading(false);
            setUploadProgress(0); 
            setCurrentFileIndex(0);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-2xl border-t-8 border-indigo-600 w-full max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h3 className="text-2xl font-bold text-indigo-700">Tải Video mới lên: "{courseTitle}"</h3>
                <button 
                    onClick={onClose} 
                    className="text-gray-500 hover:text-gray-800 transition p-1 rounded-full hover:bg-gray-100"
                    disabled={uploading}
                >
                    <X size={24} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Messages */}
                {error && <p className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200">{error}</p>}
                {success && <p className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200">{success}</p>}

                {/* Tiêu đề Video */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">Tiêu đề Khóa học (Tiêu đề gốc) <span className="text-red-500">*</span></label>
                    {/* LƯU Ý: Tiêu đề này sẽ được nối với Tên File nếu upload nhiều tệp */}
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Nhập tiêu đề gốc (ví dụ: 'Bài giảng Lịch sử Chương 1')..."
                        disabled={uploading}
                    />
                </div>

                {/* Upload File/Folder Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="videoFile">Chọn tệp hoặc **Thư mục** Video <span className="text-red-500">*</span></label>
                    <input
                        id="videoFile"
                        type="file"
                        accept="video/*"
                        multiple 
                        // @ts-ignore
                        webkitdirectory="" 
                        onChange={handleFileChange}
                        required={files.length === 0} 
                        className="hidden" 
                        disabled={uploading}
                    />
                    <label 
                        htmlFor="videoFile"
                        className={`mt-1 flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition duration-200 
                            ${files.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}
                            ${uploading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        <UploadCloud size={32} className={`mb-2 ${files.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium text-center">
                            {files.length > 0 ? (
                                <span className="flex items-center text-green-700">
                                    <FileText size={16} className="mr-1"/> Đã chọn **{files.length}** tệp.
                                </span>
                            ) : (
                                "Nhấn vào đây để chọn tệp hoặc **chọn một thư mục** để tải lên hàng loạt."
                            )}
                        </span>
                    </label>
                </div>
                
                {/* Progress Bar khi đang tải lên */}
                {uploading && (
                    <div className="space-y-2 pt-2">
                        {/* HIỂN THỊ TIẾN TRÌNH CHO TỆP HIỆN TẠI */}
                        <p className="text-sm font-semibold text-indigo-600">
                            Đang tải lên ({currentFileIndex}/{files.length} tệp): {uploadProgress}%
                        </p>
                        {files[currentFileIndex - 1] && (
                            <p className="text-xs text-gray-500 truncate">
                                Đang xử lý: **{files[currentFileIndex - 1].webkitRelativePath || files[currentFileIndex - 1].name}**
                            </p>
                        )}
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}


                {/* Submit Button */}
                <button
                    type="submit"
                    // Điều kiện: Đang upload HOẶC không có Tiêu đề HOẶC không có files
                    disabled={uploading || !title.trim() || files.length === 0} 
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white transition duration-150 
                        bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    // Hiển thị tiến trình upload folder
                    ) : (
                        <UploadCloud size={20} className="mr-2"/>
                    )}
                    {uploading ? `Đang Tải Lên ${uploadProgress}%... (File ${currentFileIndex}/${files.length})` : `Tải ${files.length > 1 ? files.length + ' Video' : 'Video'} Lên và Lưu`}
                </button>
            </form>
        </div>
    );
};

export default CreateVideoForm;