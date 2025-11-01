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
// Import các icon mới cho Session
import { Loader2, X, UploadCloud, FileText, FolderPlus, Zap, CheckCircle, ListPlus } from 'lucide-react';
import SessionManagerForm from './SessionManagerForm'; // Import component Session Manager

interface CreateVideoFormProps {
    courseId: string;
    courseTitle: string;
    adminUser: User;
    onVideoCreated: () => void;
    onClose: () => void;
}

const CreateVideoForm: React.FC<CreateVideoFormProps> = ({ courseId, courseTitle, adminUser, onVideoCreated, onClose }) => {
    const [title, setTitle] = useState('');
    const [files, setFiles] = useState<File[]>([]); 
    
    // START: THÊM STATE CHO SESSION VÀ MODAL
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedSessionTitle, setSelectedSessionTitle] = useState<string | null>(null);
    const [showSessionManager, setShowSessionManager] = useState(false);
    // END: THÊM STATE CHO SESSION VÀ MODAL
    
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(0); 

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Hàm cập nhật Session khi người dùng chọn trong modal
    const handleSessionSelected = (id: string, title: string) => {
        setSelectedSessionId(id);
        setSelectedSessionTitle(title);
    };

    // Xử lý nhiều tệp được chọn từ input (kể cả chọn tệp đơn lẻ, nhiều tệp hoặc thư mục)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles([]);
        
        if (e.target.files && e.target.files.length > 0) {
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
    
    // Hàm tải lên một tệp (Giữ nguyên)
    const uploadFile = async (videoFile: File, videoId: string): Promise<{ videoUrl: string, storagePath: string }> => {
        // Đường dẫn: artifacts/video-hub-prod-id/videos/{courseId}/{videoId}/{videoName}
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

    // Xử lý submit và lặp qua mảng files để upload hàng loạt
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!title.trim()) {
            setError("Vui lòng nhập Tiêu đề Video.");
            return;
        }
        if (!selectedSessionId) {
            setError("Vui lòng CHỌN một Session trước khi tải video lên.");
            return;
        }
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
                
                setCurrentFileIndex(i + 1); 
                setUploadProgress(0); 
                
                // 1. Tạo ID duy nhất cho video
                const videoId = generateVideoId(); 
                
                // 2. Tải file lên Firebase Storage
                const { videoUrl, storagePath } = await uploadFile(file, videoId);

                // 3. Chuẩn bị Tiêu đề cuối cùng
                const baseTitle = title.trim();
                const fileContext = (file as any).webkitRelativePath || file.name;
                const fileDisplayName = fileContext.replace(/\.[^/.]+$/, "");

                const finalTitle = files.length > 1 
                    ? `${baseTitle} - ${fileDisplayName}`
                    : baseTitle;
                
                // 4. Lưu dữ liệu vào Firestore (BỔ SUNG sessionId)
                await addVideo(
                    courseId, 
                    selectedSessionId, // TRUYỀN SESSION ID ĐÃ CHỌN
                    finalTitle, 
                    videoUrl, 
                    storagePath, 
                    adminUser.uid, 
                    videoId
                );
                
                successCount++;
            }
            
            // Thành công
            setSuccess(`Đã tải lên và thêm thành công ${successCount} video vào khóa học, Session: ${selectedSessionTitle}!`);
            setTitle('');
            setFiles([]); 
            onVideoCreated(); 
            // Giữ modal mở nếu người dùng muốn upload tiếp, nhưng đóng sau 3s nếu thành công
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
            {/* Modal Quản lý Session */}
            {showSessionManager && (
                <SessionManagerForm
                    courseId={courseId}
                    courseTitle={courseTitle}
                    onClose={() => setShowSessionManager(false)}
                    onSessionSelected={(id, title) => {
                        handleSessionSelected(id, title);
                        setShowSessionManager(false); // Đóng modal sau khi chọn
                    }}
                    selectedSessionId={selectedSessionId}
                />
            )}

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

                {/* KHU VỰC CHỌN SESSION */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                    <label className="block text-base font-semibold text-gray-700 mb-2 flex items-center">
                        <ListPlus size={18} className="mr-2 text-indigo-600"/> 1. Chọn Session <span className="text-red-500 ml-1">*</span>
                    </label>

                    {/* Hiển thị Session đã chọn */}
                    {selectedSessionId ? (
                        <div className="flex items-center justify-between p-2 bg-indigo-100 border border-indigo-400 rounded-lg text-indigo-800 font-medium text-sm">
                            <span className="flex items-center">
                                <CheckCircle size={18} className="mr-2 text-indigo-600"/>
                                Đã chọn: **{selectedSessionTitle}**
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowSessionManager(true)}
                                className="text-indigo-600 hover:text-indigo-800 transition text-xs font-semibold underline disabled:opacity-50"
                                disabled={uploading}
                            >
                                Thay đổi
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mb-3">
                            Video sẽ được thêm vào Session đã chọn. Vui lòng tạo hoặc chọn Session.
                        </p>
                    )}

                    {/* Nút mở Modal Quản lý Session */}
                    <button
                        type="button"
                        onClick={() => setShowSessionManager(true)}
                        className={`w-full py-2 flex items-center justify-center font-medium rounded-lg shadow-sm transition ${
                            uploading ? 'bg-gray-300 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                        disabled={uploading}
                    >
                        <Zap size={20} className="mr-2" /> Quản lý (Tạo/Xóa/Chọn) Sessions
                    </button>
                </div>
                
                {/* Tiêu đề Video */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">2. Tiêu đề Gốc/Tiền tố <span className="text-red-500">*</span></label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Nhập tiêu đề gốc (ví dụ: 'Bài giảng Chương 1')..."
                        disabled={uploading}
                    />
                </div>

                {/* TRẠNG THÁI FILE ĐÃ CHỌN */}
                {files.length > 0 && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 flex items-center">
                        <FileText size={16} className="mr-2"/>
                        Đã chọn **{files.length}** tệp để tải lên.
                    </div>
                )}


                {/* Upload File/Folder Selection AREA */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">3. Phương thức Tải lên <span className="text-red-500">*</span></label>

                    {/* Input ẩn cho FILES (Multiple files) */}
                    <input
                        id="fileInput"
                        type="file"
                        accept="video/*"
                        multiple 
                        onChange={handleFileChange}
                        required={files.length === 0} 
                        className="hidden" 
                        disabled={uploading}
                    />
                    
                    {/* Input ẩn cho FOLDERS (webkitdirectory) */}
                    <input
                        id="folderInput"
                        type="file"
                        accept="video/*"
                        // @ts-ignore
                        webkitdirectory="" 
                        multiple 
                        onChange={handleFileChange}
                        required={files.length === 0} 
                        className="hidden" 
                        disabled={uploading}
                    />

                    {/* Vùng chọn trực quan (hai nút) */}
                    <div className="grid grid-cols-2 gap-4">
                        <label 
                            htmlFor="fileInput"
                            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition duration-200 
                                hover:border-indigo-500 hover:bg-indigo-50 shadow-sm
                                ${files.length === 0 ? 'border-gray-300' : 'border-green-400 bg-green-50'}`}
                        >
                            <UploadCloud size={28} className={`mb-1 ${files.length === 0 ? 'text-gray-400' : 'text-green-600'}`} />
                            <span className="text-sm font-semibold text-center">Chọn Tệp Tin (Multi-File)</span>
                            <span className="text-xs text-gray-500 mt-1">(Từng tệp video riêng lẻ)</span>
                        </label>
                        
                        <label 
                            htmlFor="folderInput"
                            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition duration-200 
                                hover:border-indigo-500 hover:bg-indigo-50 shadow-sm
                                ${files.length === 0 ? 'border-gray-300' : 'border-green-400 bg-green-50'}`}
                        >
                            <FolderPlus size={28} className={`mb-1 ${files.length === 0 ? 'text-gray-400' : 'text-green-600'}`} />
                            <span className="text-sm font-semibold text-center">Chọn Thư Mục (Folder)</span>
                            <span className="text-xs text-gray-500 mt-1">(Tải lên hàng loạt nội dung folder)</span>
                        </label>
                    </div>

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
                                Đang xử lý: **{(files[currentFileIndex - 1] as any).webkitRelativePath || files[currentFileIndex - 1].name}**
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
                    // Điều kiện: Đang upload HOẶC không có Tiêu đề HOẶC không có files HOẶC KHÔNG CÓ SESSION ID
                    disabled={uploading || !title.trim() || files.length === 0 || !selectedSessionId} 
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white transition duration-150 
                        bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
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
