import React, { useState, useEffect } from 'react';
import { 
    addVideo, 
    updateVideo, // [NEW] Hàm update
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    generateVideoId, 
    getFirebaseStorage,
    type LessonType,
    type LessonBlock,
    type Video // [NEW] Import Video type
} from '../../services/firebase'; 
import { type User } from 'firebase/auth';
import { 
    Loader2, X, UploadCloud, FileText, Zap, CheckCircle, 
    ListPlus, Video as VideoIcon, FileQuestion, Save, Headphones, LayoutTemplate 
} from 'lucide-react';
import LessonBuilder from './LessonBuilder'; 

interface CreateVideoFormProps {
    courseId: string;
    courseTitle: string;
    adminUser: User;
    onVideoCreated: () => void;
    onClose: () => void;
    
    // Callback để yêu cầu cha (Dashboard) mở Modal chọn Session
    onRequestSessionManager: (
        currentSessionId: string | null, 
        onSelect: (id: string, title: string) => void
    ) => void;

    // [NEW] Prop nhận video cần sửa (Nếu null => Tạo mới)
    initialVideo?: Video | null;
}

const CreateVideoForm: React.FC<CreateVideoFormProps> = ({ 
    courseId, courseTitle, adminUser, onVideoCreated, onClose, onRequestSessionManager,
    initialVideo // [NEW]
}) => {
    // Xác định chế độ Edit hay Create
    const isEditing = !!initialVideo;

    // 1. STATE QUẢN LÝ LOẠI BÀI HỌC
    const [contentType, setContentType] = useState<LessonType>('video');
    
    // Tạo ID nháp hoặc dùng ID cũ nếu đang edit
    const [draftVideoId] = useState(initialVideo?.id || generateVideoId());

    // State chung cho Text / Quiz / Audio Title
    const [textTitle, setTextTitle] = useState('');
    const [textContent, setTextContent] = useState(''); 
    
    // State riêng cho Lesson Builder (Mảng các Block)
    const [lessonBlocks, setLessonBlocks] = useState<LessonBlock[]>([]);

    // State cho File Upload (Video / Audio)
    const [files, setFiles] = useState<File[]>([]); 
    
    // State chọn Session
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedSessionTitle, setSelectedSessionTitle] = useState<string | null>(null);
    
    // UI State
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(0); 
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // [NEW] EFFECT: Load dữ liệu cũ nếu đang Edit
    useEffect(() => {
        if (initialVideo) {
            setContentType(initialVideo.type || 'video');
            setTextTitle(initialVideo.title);
            setSelectedSessionId(initialVideo.sessionId);
            setSelectedSessionTitle("Session hiện tại (Click để thay đổi)"); 

            // Load nội dung theo type
            if (initialVideo.type === 'custom') {
                setLessonBlocks(initialVideo.blockData || []);
            } else if (initialVideo.type === 'text') {
                setTextContent(initialVideo.content || '');
            } else if (initialVideo.type === 'quiz') {
                setTextContent(initialVideo.quizData || '');
            } else if (initialVideo.type === 'audio') {
                setTextContent(initialVideo.content || ''); // Transcript
            }
        }
    }, [initialVideo]);

    // --- HANDLERS ---

    const handleOpenSessionManager = () => {
        onRequestSessionManager(selectedSessionId, (id, title) => {
            setSelectedSessionId(id);
            setSelectedSessionTitle(title);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles([]);
        setError('');
        
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            
            // Validate loại file
            if (contentType === 'video') {
                const invalidFile = selectedFiles.find(f => !f.type.startsWith('video/'));
                if (invalidFile) {
                    setError('Vui lòng chỉ chọn file Video (.mp4, .mov...)');
                    return;
                }
            } else if (contentType === 'audio') {
                const invalidFile = selectedFiles.find(f => !f.type.startsWith('audio/'));
                if (invalidFile) {
                    setError('Vui lòng chỉ chọn file Audio (.mp3, .wav...)');
                    return;
                }
            }
            // Nếu edit thì có thể thay thế file cũ
            if (contentType === 'audio' && selectedFiles.length > 1) {
                setError('Mỗi bài học Audio chỉ được upload 1 file.');
                return;
            }
            
            setFiles(selectedFiles);
        }
    };
    
    // Hàm Upload File dùng chung
    const uploadFile = async (file: File, fileId: string, folderName: string): Promise<{ url: string, storagePath: string }> => {
        const filePath = `artifacts/video-hub-prod-id/${folderName}/${courseId}/${fileId}/${file.name}`;
        const storageRef = ref(getFirebaseStorage(), filePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress)); 
                },
                (err) => reject(err),
                async () => {
                    try {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({ url, storagePath: filePath });
                    } catch (e) {
                        reject(e);
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

        try {
            // [NEW] Logic Update chung cho các trường cơ bản
            const commonUpdateData = {
                title: textTitle,
                sessionId: selectedSessionId,
                type: contentType,
            };

            // CASE 1: VIDEO
            if (contentType === 'video') {
                if (isEditing) {
                    // EDIT: Nếu có file mới thì upload, không thì chỉ update title/session
                    if (files.length > 0) {
                        // (Giả sử Edit Video chỉ hỗ trợ thay thế 1 video chính)
                        const file = files[0];
                        const { url, storagePath } = await uploadFile(file, draftVideoId, 'videos');
                        await updateVideo(courseId, draftVideoId, {
                            ...commonUpdateData,
                            videoUrl: url,
                            storagePath
                        });
                    } else {
                        await updateVideo(courseId, draftVideoId, commonUpdateData);
                    }
                    setSuccess("Cập nhật Video thành công!");
                } else {
                    // CREATE
                    if (files.length === 0) throw new Error("Chưa chọn file Video nào.");
                    let successCount = 0;
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        setCurrentFileIndex(i + 1); 
                        setUploadProgress(0); 
                        
                        const videoId = generateVideoId(); 
                        const { url, storagePath } = await uploadFile(file, videoId, 'videos');
                        const title = file.name.replace(/\.[^/.]+$/, ""); 
                        
                        await addVideo(
                            courseId, selectedSessionId, title, url, storagePath, adminUser.uid, 
                            videoId, 'video'
                        );
                        successCount++;
                    }
                    setSuccess(`Đã tải lên ${successCount} video thành công!`);
                    setFiles([]); 
                }
            } 
            
            // CASE 2: AUDIO
            else if (contentType === 'audio') {
                if (!textTitle.trim()) throw new Error("Vui lòng nhập tiêu đề Audio.");
                
                if (isEditing) {
                    const updateData: any = { ...commonUpdateData, content: textContent };
                    if (files.length > 0) {
                        const { url, storagePath } = await uploadFile(files[0], draftVideoId, 'audios');
                        updateData.audioUrl = url;
                        updateData.storagePath = storagePath;
                    }
                    await updateVideo(courseId, draftVideoId, updateData);
                    setSuccess("Cập nhật Audio thành công!");
                } else {
                    if (files.length === 0) throw new Error("Chưa chọn file Audio.");
                    const { url, storagePath } = await uploadFile(files[0], draftVideoId, 'audios');
                    await addVideo(
                        courseId, selectedSessionId, textTitle, '', storagePath, adminUser.uid, 
                        draftVideoId, 'audio', textContent, '', [], url
                    );
                    setSuccess("Đã thêm bài Audio thành công!");
                    setTextTitle(''); setTextContent(''); setFiles([]);
                }
            }

            // CASE 3: CUSTOM
            else if (contentType === 'custom') {
                if (!textTitle.trim()) throw new Error("Vui lòng nhập tiêu đề bài học.");
                if (lessonBlocks.length === 0) throw new Error("Bài học chưa có nội dung nào.");

                const storageFolderPath = `artifacts/video-hub-prod-id/assets/${courseId}/${draftVideoId}`;

                if (isEditing) {
                    await updateVideo(courseId, draftVideoId, {
                        ...commonUpdateData,
                        blockData: lessonBlocks
                    });
                    setSuccess("Cập nhật Bài học Tương tác thành công!");
                } else {
                    await addVideo(
                        courseId, selectedSessionId, textTitle, '', storageFolderPath, adminUser.uid,
                        draftVideoId, 'custom', '', '', lessonBlocks
                    );
                    setSuccess("Đã tạo Bài học Tương tác thành công!");
                    setTextTitle(''); setLessonBlocks([]);
                }
            }

            // CASE 4: TEXT / QUIZ
            else {
                if (!textTitle.trim()) throw new Error("Vui lòng nhập tiêu đề.");
                
                if (isEditing) {
                    const updateData: any = { ...commonUpdateData };
                    if (contentType === 'text') updateData.content = textContent;
                    if (contentType === 'quiz') updateData.quizData = textContent;
                    
                    await updateVideo(courseId, draftVideoId, updateData);
                    setSuccess("Cập nhật thành công!");
                } else {
                    const id = generateVideoId();
                    await addVideo(
                        courseId, selectedSessionId, textTitle, '', '', adminUser.uid, id,
                        contentType, 
                        contentType === 'text' ? textContent : '', 
                        contentType === 'quiz' ? textContent : '' 
                    );
                    setSuccess(`Đã thêm ${contentType} thành công!`);
                    setTextTitle(''); setTextContent('');
                }
            }
            
            onVideoCreated(); 
            setTimeout(onClose, 1500); 
            
        } catch (err: any) {
            console.error("Lỗi xử lý:", err);
            setError(err.message || "Đã xảy ra lỗi không xác định.");
        } finally {
            setUploading(false);
            setUploadProgress(0); 
            setCurrentFileIndex(0);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-2xl border-t-8 border-indigo-600 w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto custom-scrollbar relative">
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold text-indigo-700">
                    {/* [UPDATED] Tiêu đề thay đổi theo chế độ */}
                    {isEditing ? `Chỉnh sửa: "${initialVideo?.title}"` : `Thêm Nội dung: "${courseTitle}"`}
                </h3>
                <button 
                    onClick={onClose} 
                    disabled={uploading} 
                    className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition"
                >
                    <X size={24} />
                </button>
            </div>
            
            {/* TABS CHỌN TYPE */}
            <div className="flex mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                {[
                    { id: 'video', label: 'Video', icon: VideoIcon, color: 'text-indigo-600' },
                    { id: 'audio', label: 'Audio', icon: Headphones, color: 'text-purple-600' },
                    { id: 'custom', label: 'Tương tác', icon: LayoutTemplate, color: 'text-pink-600' },
                    { id: 'text', label: 'Bài giảng', icon: FileText, color: 'text-green-600' },
                    { id: 'quiz', label: 'Quiz', icon: FileQuestion, color: 'text-orange-600' },
                ].map((tab) => (
                    <button 
                        key={tab.id}
                        type="button"
                        // [UPDATED] Không cho đổi type khi đang edit
                        onClick={() => !isEditing && setContentType(tab.id as LessonType)}
                        disabled={uploading || isEditing}
                        className={`flex-1 min-w-[100px] py-2 text-sm font-bold rounded-md flex items-center justify-center space-x-2 transition ${
                            contentType === tab.id 
                            ? `bg-white ${tab.color} shadow-sm` 
                            : 'text-gray-500 hover:text-gray-700'
                        } ${isEditing && contentType !== tab.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <tab.icon size={16}/> <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                ))}
            </div>
            
            {/* MAIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* NOTIFICATIONS */}
                {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 flex items-center"><X size={16} className="mr-2"/>{error}</div>}
                {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200 flex items-center"><CheckCircle size={16} className="mr-2"/>{success}</div>}

                {/* 1. SESSION SELECTOR (Gọi Modal của Cha) */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <ListPlus size={18} className="mr-2 text-indigo-600"/> 1. Chọn Session <span className="text-red-500 ml-1">*</span>
                    </label>
                    {selectedSessionId ? (
                        <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 font-medium text-sm">
                            <span className="flex items-center"><CheckCircle size={18} className="mr-2 text-indigo-600"/> Đã chọn: <strong className="ml-1">{selectedSessionTitle}</strong></span>
                            <button type="button" onClick={handleOpenSessionManager} disabled={uploading} className="text-indigo-600 underline text-xs hover:text-indigo-800">Thay đổi</button>
                        </div>
                    ) : (
                        <button type="button" onClick={handleOpenSessionManager} disabled={uploading} className="w-full py-3 bg-white border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 flex justify-center items-center font-bold text-sm transition dashed">
                            <Zap size={18} className="mr-2" /> Nhấn để chọn Session
                        </button>
                    )}
                </div>

                {/* 2. DYNAMIC FIELDS THEO TYPE */}
                <div className="min-h-[200px]">
                    {contentType === 'custom' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">2. Tiêu đề Bài học <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition" 
                                    value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="VD: Luyện nghe Part 1 (Có đáp án chi tiết)..." required
                                />
                            </div>
                            <div className="border-t border-gray-200 pt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center">
                                    3. Xây dựng nội dung <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Kéo xuống để thêm các phần</span>
                                </label>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <LessonBuilder 
                                        courseId={courseId} 
                                        lessonId={draftVideoId} 
                                        initialBlocks={lessonBlocks}
                                        onChange={setLessonBlocks}
                                    />
                                </div>
                            </div>
                        </div>

                    ) : contentType === 'video' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {/* [UPDATED] Label thay đổi */}
                                2. {isEditing ? 'Thay đổi Video (Để trống nếu giữ nguyên)' : 'Chọn Video (Có thể chọn nhiều file)'} 
                                {isEditing ? '' : <span className="text-red-500 ml-1">*</span>}
                            </label>

                            {/* [UPDATED] Hiển thị video hiện tại khi Edit */}
                            {isEditing && initialVideo?.videoUrl && (
                                <p className="text-xs text-gray-500 mb-2 flex items-center">
                                    <VideoIcon size={12} className="mr-1"/> Video hiện tại: 
                                    <a href={initialVideo.videoUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline ml-1 font-medium">Xem</a>
                                </p>
                            )}

                            <input id="fileInput" type="file" accept="video/*" multiple={!isEditing} onChange={handleFileChange} className="hidden" disabled={uploading} />
                            
                            <label htmlFor="fileInput" className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all ${files.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'}`}>
                                <UploadCloud size={40} className={`mb-3 ${files.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="text-sm font-bold text-gray-600">
                                    {files.length > 0 
                                        ? `Đã chọn ${files.length} video` 
                                        : (isEditing ? 'Click để tải video mới thay thế' : 'Click để chọn Video từ máy tính')}
                                </span>
                                <span className="text-xs text-gray-400 mt-1">Hỗ trợ MP4, MOV, MKV...</span>
                            </label>

                            {files.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {files.map((f, idx) => (
                                        <div key={idx} className="flex items-center text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                                            <VideoIcon size={14} className="mr-2 text-indigo-500"/> {f.name} <span className="ml-auto text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {uploading && (
                                <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <p className="text-xs font-bold text-indigo-700 mb-2 flex justify-between">
                                        <span>Đang tải lên ({currentFileIndex}/{files.length || 1})...</span>
                                        <span>{uploadProgress}%</span>
                                    </p>
                                    <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                                        <div className="bg-indigo-600 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                    ) : contentType === 'audio' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">2. Tiêu đề Audio <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-purple-500 transition" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} required placeholder="VD: Listening Test 1..." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    {isEditing ? '3. File Audio (Chọn để thay thế)' : '3. File Audio (.mp3, .wav)'} 
                                    {!isEditing && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                <input type="file" accept="audio/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">4. Transcript / Mô tả (Tùy chọn)</label>
                                <textarea className="w-full p-3 border border-gray-300 rounded-lg h-32 text-sm focus:border-purple-500 outline-none transition" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Nội dung bài nghe hoặc lời thoại..."></textarea>
                            </div>
                        </div>

                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">2. Tiêu đề <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 transition" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} required placeholder={`Nhập tên ${contentType}...`}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    {contentType === 'quiz' ? '3. Dữ liệu Quiz (JSON)' : '3. Nội dung Bài giảng (Markdown)'}
                                </label>
                                <textarea 
                                    className="w-full p-3 border border-gray-300 rounded-lg h-48 font-mono text-sm focus:border-indigo-500 outline-none transition" 
                                    value={textContent} 
                                    onChange={(e) => setTextContent(e.target.value)} 
                                    placeholder={contentType === 'quiz' ? '[{"question": "...", "answers": ["A", "B"], "correct": 0}]' : 'Nội dung bài học...'}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* SUBMIT BUTTON */}
                <button 
                    type="submit" 
                    disabled={uploading || !selectedSessionId} 
                    className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition duration-200 mt-6 ${
                        uploading || !selectedSessionId 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5'
                    }`}
                >
                    {uploading ? <Loader2 className="animate-spin mr-2" /> : <Save size={20} className="mr-2"/>}
                    {uploading ? 'Đang xử lý...' : (isEditing ? 'Cập nhật Thay đổi' : 'Lưu & Thêm mới')}
                </button>
            </form>
        </div>
    );
};

export default CreateVideoForm;