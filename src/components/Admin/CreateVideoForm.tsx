import React, { useState } from 'react';
// ĐÃ SỬA LỖI: Thay đổi độ sâu đường dẫn để khắc phục lỗi "Could not resolve"
// LƯU Ý: Vẫn dùng đường dẫn bạn cung cấp, giả định các hàm sau có trong service: 
// addVideo, storage, ref, uploadBytesResumable, getDownloadURL, generateVideoId
import { 
    addVideo, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    generateVideoId, // GIẢ ĐỊNH hàm này đã được thêm vào service
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
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            // Kiểm tra loại file cơ bản
            if (!selectedFile.type.startsWith('video/')) {
                setError('Vui lòng chọn một tập tin video hợp lệ.');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError('');
        }
    };
    
    // ĐÃ SỬA: Thêm videoId vào hàm để tạo đường dẫn Storage duy nhất và vĩnh viễn
    const uploadFile = async (videoFile: File, videoId: string): Promise<{ videoUrl: string, storagePath: string }> => {
        // Đường dẫn: artifacts/APP_ID_ROOT/videos/{courseId}/{videoId}/{videoName}
        // Sử dụng videoId để đảm bảo đường dẫn là duy nhất cho mỗi video, không phụ thuộc vào timestamp
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!title.trim()) {
            setError("Vui lòng nhập Tiêu đề Video.");
            return;
        }
        if (!file) {
            setError("Vui lòng chọn tập tin video để tải lên.");
            return;
        }
        
        setUploading(true);
        setUploadProgress(0);

        try {
            // ĐÃ THÊM: Tạo ID duy nhất trước khi upload và sử dụng nó trong suốt quá trình
            const videoId = generateVideoId(); 
            
            // 1. Tải file lên Firebase Storage
            const { videoUrl, storagePath } = await uploadFile(file, videoId);

            // 2. Chuẩn bị dữ liệu cho Firestore
            // Giả định hàm addVideo của bạn đã được cập nhật để nhận videoId và các trường cần thiết
            await addVideo(
                courseId, 
                title.trim(), 
                videoUrl, 
                storagePath, 
                adminUser.uid, 
                videoId // Truyền ID đã tạo
            );
            
            // Thành công
            setSuccess(`Video "${title.trim()}" đã được tải lên và thêm thành công!`);
            setTitle('');
            setFile(null);
            onVideoCreated(); 
            setTimeout(onClose, 2500); 
            
        } catch (err: any) {
            console.error("Lỗi khi tải hoặc tạo Video:", err);
            setError(`Tạo video thất bại. Lỗi: ${err.message || "Vui lòng kiểm tra kết nối mạng và quy tắc Storage/Firestore."}`);
        } finally {
            setUploading(false);
            setUploadProgress(0); 
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
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">Tiêu đề Bài học <span className="text-red-500">*</span></label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Nhập tiêu đề video..."
                        disabled={uploading}
                    />
                </div>

                {/* Upload File Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="videoFile">Chọn tệp Video <span className="text-red-500">*</span></label>
                    <input
                        id="videoFile"
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        required={!file}
                        className="hidden" // Ẩn input gốc
                        disabled={uploading}
                    />
                    <label 
                        htmlFor="videoFile"
                        className={`mt-1 flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition duration-200 
                            ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}
                            ${uploading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        <UploadCloud size={32} className={`mb-2 ${file ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium text-center">
                            {file ? (
                                <span className="flex items-center text-green-700">
                                    <FileText size={16} className="mr-1"/> Đã chọn: {file.name}
                                </span>
                            ) : (
                                "Nhấn vào đây để chọn tệp video (MP4, MOV, v.v.)"
                            )}
                        </span>
                    </label>
                </div>
                
                {/* Progress Bar khi đang tải lên */}
                {uploading && (
                    <div className="space-y-2 pt-2">
                        <p className="text-sm font-semibold text-indigo-600">Đang tải lên: {uploadProgress}%</p>
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
                    disabled={uploading || !title.trim() || !file}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white transition duration-150 
                        bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                        <UploadCloud size={20} className="mr-2"/>
                    )}
                    {uploading ? `Đang Tải Lên ${uploadProgress}%...` : 'Tải Video Lên và Lưu'}
                </button>
            </form>
        </div>
    );
};

export default CreateVideoForm;
