import React, { useState } from 'react';
import { 
    addVideo, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    generateVideoId, 
    getFirebaseStorage,
    type LessonType 
} from '../../services/firebase'; 
import { type User } from 'firebase/auth';
import { Loader2, X, UploadCloud, FileText, FolderPlus, Zap, CheckCircle, ListPlus, Video as VideoIcon, FileQuestion, Save } from 'lucide-react';
import SessionManagerForm from './SessionManagerForm';

interface CreateVideoFormProps {
    courseId: string;
    courseTitle: string;
    adminUser: User;
    onVideoCreated: () => void;
    onClose: () => void;
}

const CreateVideoForm: React.FC<CreateVideoFormProps> = ({ courseId, courseTitle, adminUser, onVideoCreated, onClose }) => {
    // STATE QUẢN LÝ TYPE
    const [contentType, setContentType] = useState<LessonType>('video');
    
    // State cho Text/Quiz
    const [textTitle, setTextTitle] = useState('');
    const [textContent, setTextContent] = useState(''); 

    // State cho Video Files
    const [files, setFiles] = useState<File[]>([]); 
    
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedSessionTitle, setSelectedSessionTitle] = useState<string | null>(null);
    const [showSessionManager, setShowSessionManager] = useState(false);
    
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(0); 

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSessionSelected = (id: string, title: string) => {
        setSelectedSessionId(id);
        setSelectedSessionTitle(title);
    };

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
    
    const uploadFile = async (videoFile: File, videoId: string): Promise<{ videoUrl: string, storagePath: string }> => {
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

        if (!selectedSessionId) {
            setError("Vui lòng CHỌN một Session trước khi thêm nội dung.");
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setCurrentFileIndex(0); 

        try {
            // XỬ LÝ THEO LOẠI CONTENT
            if (contentType === 'video') {
                if (files.length === 0) {
                    setError("Vui lòng chọn ít nhất một tệp video.");
                    setUploading(false);
                    return;
                }

                let successCount = 0;
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setCurrentFileIndex(i + 1); 
                    setUploadProgress(0); 
                    
                    const videoId = generateVideoId(); 
                    const { videoUrl, storagePath } = await uploadFile(file, videoId);

                    const fileContext = (file as any).webkitRelativePath || file.name;
                    const finalTitle = fileContext.replace(/\.[^/.]+$/, ""); 
                    
                    await addVideo(
                        courseId, 
                        selectedSessionId, 
                        finalTitle, 
                        videoUrl, 
                        storagePath, 
                        adminUser.uid, 
                        videoId,
                        'video'
                    );
                    
                    successCount++;
                }
                setSuccess(`Đã tải lên ${successCount} video thành công!`);
                setFiles([]); 
            } else {
                // XỬ LÝ TEXT HOẶC QUIZ
                if (!textTitle.trim()) {
                    setError("Vui lòng nhập tiêu đề.");
                    setUploading(false);
                    return;
                }

                const contentId = generateVideoId();
                await addVideo(
                    courseId, 
                    selectedSessionId, 
                    textTitle, 
                    '', 
                    '', 
                    adminUser.uid, 
                    contentId,
                    contentType,
                    contentType === 'text' ? textContent : '', 
                    contentType === 'quiz' ? textContent : ''  
                );
                
                setSuccess(`Đã thêm ${contentType === 'text' ? 'Bài giảng' : 'Quiz'} thành công!`);
                setTextTitle('');
                setTextContent('');
            }
            
            onVideoCreated(); 
            setTimeout(onClose, 2500); 
            
        } catch (err: any) {
            console.error("Lỗi khi tạo nội dung:", err);
            setError(`Thất bại: ${err.message || "Lỗi không xác định"}`);
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
                        setShowSessionManager(false); 
                    }}
                    selectedSessionId={selectedSessionId}
                />
            )}

            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold text-indigo-700">Thêm Nội dung: "{courseTitle}"</h3>
                <button 
                    onClick={onClose} 
                    className="text-gray-500 hover:text-gray-800 transition p-1 rounded-full hover:bg-gray-100"
                    disabled={uploading}
                >
                    <X size={24} />
                </button>
            </div>
            
            {/* TAB SELECTOR */}
            <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
                <button 
                    type="button"
                    onClick={() => setContentType('video')}
                    disabled={uploading}
                    className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center space-x-2 transition ${contentType === 'video' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <VideoIcon size={16}/> <span>Video</span>
                </button>
                <button 
                    type="button"
                    onClick={() => setContentType('text')}
                    disabled={uploading}
                    className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center space-x-2 transition ${contentType === 'text' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText size={16}/> <span>Bài giảng</span>
                </button>
                <button 
                    type="button"
                    onClick={() => setContentType('quiz')}
                    disabled={uploading}
                    className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center space-x-2 transition ${contentType === 'quiz' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileQuestion size={16}/> <span>Quiz</span>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
                
                {error && <p className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium border border-red-200">{error}</p>}
                {success && <p className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200">{success}</p>}

                {/* SESSION SELECTION */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                    <label className="block text-base font-semibold text-gray-700 mb-2 flex items-center">
                        <ListPlus size={18} className="mr-2 text-indigo-600"/> 1. Chọn Session <span className="text-red-500 ml-1">*</span>
                    </label>

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
                        <button
                            type="button"
                            onClick={() => setShowSessionManager(true)}
                            className={`w-full py-2 flex items-center justify-center font-medium rounded-lg shadow-sm transition ${
                                uploading ? 'bg-gray-300 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                            disabled={uploading}
                        >
                            <Zap size={20} className="mr-2" /> Chọn Session
                        </button>
                    )}
                </div>

                {/* FORM FIELDS */}
                {contentType === 'video' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">2. Chọn Video (Files/Folder) <span className="text-red-500">*</span></label>
                        
                        {/* Hidden Input for Files */}
                        <input id="fileInput" type="file" accept="video/*" multiple onChange={handleFileChange} className="hidden" disabled={uploading} />
                        
                        {/* ✅ FIX LỖI TS(2322):
                            Sử dụng spread operator với casting as any để bypass kiểm tra type cho webkitdirectory 
                        */}
                        <input 
                            id="folderInput" 
                            type="file" 
                            accept="video/*"
                            {...({ webkitdirectory: "" } as any)}
                            multiple 
                            onChange={handleFileChange} 
                            className="hidden" 
                            disabled={uploading} 
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <label htmlFor="fileInput" className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition ${files.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'}`}>
                                <UploadCloud size={28} className={`mb-1 ${files.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="text-sm font-semibold">Chọn Files</span>
                            </label>
                            
                            <label htmlFor="folderInput" className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition ${files.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'}`}>
                                <FolderPlus size={28} className={`mb-1 ${files.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="text-sm font-semibold">Chọn Folder</span>
                            </label>
                        </div>
                        
                        {files.length > 0 && (
                            <div className="mt-2 text-sm text-indigo-700 font-medium text-center">
                                Đã chọn {files.length} video.
                            </div>
                        )}

                        {uploading && (
                            <div className="space-y-2 pt-4">
                                <p className="text-sm font-semibold text-indigo-600">
                                    Đang tải lên ({currentFileIndex}/{files.length}): {uploadProgress}%
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">2. Tiêu đề {contentType === 'quiz' ? 'Quiz' : 'Bài giảng'} <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" 
                                value={textTitle}
                                onChange={(e) => setTextTitle(e.target.value)}
                                placeholder={`Nhập tên ${contentType === 'quiz' ? 'bài kiểm tra' : 'bài giảng'}...`}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {contentType === 'quiz' ? '3. Dữ liệu Quiz (JSON)' : '3. Nội dung Bài giảng'}
                            </label>
                            <textarea 
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition h-40 font-mono text-sm"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder={contentType === 'quiz' ? '[{"question": "Câu hỏi 1?", "answers": ["A", "B"], "correct": 0}]' : 'Nội dung bài học (Hỗ trợ Markdown/HTML cơ bản)...'}
                            />
                            {contentType === 'quiz' && <p className="text-xs text-gray-500 mt-1">* Nhập JSON mảng câu hỏi (Tính năng Builder sẽ cập nhật sau).</p>}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={uploading || !selectedSessionId || (contentType === 'video' && files.length === 0)}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white transition duration-150 bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                        contentType === 'video' ? <VideoIcon size={20} className="mr-2"/> : <Save size={20} className="mr-2"/>
                    )}
                    {uploading ? 'Đang xử lý...' : 'Lưu & Thêm mới'}
                </button>
            </form>
        </div>
    );
};

export default CreateVideoForm;