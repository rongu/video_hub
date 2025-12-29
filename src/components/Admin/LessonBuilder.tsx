import React, { useState } from 'react';
import { 
    Plus, Trash2, Image as ImageIcon, Headphones, HelpCircle, 
    UploadCloud, X, ChevronDown, ChevronUp, Loader2, Eye, EyeOff 
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
    ref, uploadBytesResumable, getDownloadURL, getFirebaseStorage,
    type LessonBlock, type BlockAudio, type BlockImage, type BlockQuiz 
} from '../../services/firebase';

interface LessonBuilderProps {
    courseId: string;
    lessonId: string; // ID nháp để lưu file
    initialBlocks?: LessonBlock[];
    onChange: (blocks: LessonBlock[]) => void;
}

const LessonBuilder: React.FC<LessonBuilderProps> = ({ courseId, lessonId, initialBlocks = [], onChange }) => {
    const [blocks, setBlocks] = useState<LessonBlock[]>(initialBlocks);
    const [uploading, setUploading] = useState(false);

    // --- HELPER: UPDATE BLOCKS & NOTIFY PARENT ---
    const updateBlocks = (newBlocks: LessonBlock[]) => {
        setBlocks(newBlocks);
        onChange(newBlocks);
    };

    // --- BLOCK ACTIONS ---
    const addBlock = () => {
        const newBlock: LessonBlock = {
            id: uuidv4(),
            title: `Phần ${blocks.length + 1}`,
            description: '',
            audios: [],
            images: [],
            quizzes: []
        };
        updateBlocks([...blocks, newBlock]);
    };

    const removeBlock = (blockId: string) => {
        if (confirm('Bạn có chắc muốn xóa phần này không?')) {
            updateBlocks(blocks.filter(b => b.id !== blockId));
        }
    };

    const updateBlockField = (blockId: string, field: keyof LessonBlock, value: any) => {
        const newBlocks = blocks.map(b => b.id === blockId ? { ...b, [field]: value } : b);
        updateBlocks(newBlocks);
    };

    // --- UPLOAD HANDLER (AUDIO & IMAGE) ---
    const handleUpload = async (file: File, type: 'audio' | 'image', blockId: string) => {
        if (!file) return;
        setUploading(true);
        try {
            // Path: artifacts/video-hub-prod-id/assets/{courseId}/{lessonId}/{fileName}
            const filePath = `artifacts/video-hub-prod-id/assets/${courseId}/${lessonId}/${uuidv4()}_${file.name}`;
            const storageRef = ref(getFirebaseStorage(), filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            // Wait for upload
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', null, reject, () => resolve());
            });
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Update Block Data
            const targetBlock = blocks.find(b => b.id === blockId);
            if (!targetBlock) return;

            if (type === 'audio') {
                const newAudio: BlockAudio = { id: uuidv4(), name: file.name, url: downloadURL };
                updateBlockField(blockId, 'audios', [...(targetBlock.audios || []), newAudio]);
            } else {
                const newImage: BlockImage = { id: uuidv4(), url: downloadURL, caption: '', isSpoiler: false };
                updateBlockField(blockId, 'images', [...(targetBlock.images || []), newImage]);
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload thất bại!");
        } finally {
            setUploading(false);
        }
    };

    // --- SUB-ITEM ACTIONS (DELETE, TOGGLE SPOILER) ---
    const removeSubItem = (blockId: string, type: 'audios' | 'images' | 'quizzes', itemId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        const list = targetBlock[type] as any[];
        updateBlockField(blockId, type, list.filter(i => i.id !== itemId));
    };

    const toggleSpoiler = (blockId: string, imgId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock || !targetBlock.images) return;
        const newImages = targetBlock.images.map(img => img.id === imgId ? { ...img, isSpoiler: !img.isSpoiler } : img);
        updateBlockField(blockId, 'images', newImages);
    };

    // --- QUIZ ACTIONS ---
    const addQuiz = (blockId: string) => {
        const question = prompt("Nhập câu hỏi:");
        if (!question) return;
        const ansStr = prompt("Nhập các đáp án ngăn cách bởi dấu phẩy (VD: Cam, Táo, Xoài):");
        if (!ansStr) return;
        const answers = ansStr.split(',').map(s => s.trim());
        const correctStr = prompt(`Chọn đáp án đúng (1-${answers.length}):`, "1");
        const correctIndex = parseInt(correctStr || "1") - 1;

        const newQuiz: BlockQuiz = {
            id: uuidv4(),
            question,
            answers,
            correctIndex: (correctIndex >= 0 && correctIndex < answers.length) ? correctIndex : 0,
            explanation: ''
        };

        const targetBlock = blocks.find(b => b.id === blockId);
        if (targetBlock) {
            updateBlockField(blockId, 'quizzes', [...(targetBlock.quizzes || []), newQuiz]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 italic">Kéo thả để sắp xếp (Tính năng sắp cập nhật)</p>
                <button type="button" onClick={addBlock} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-200 flex items-center">
                    <Plus size={16} className="mr-2"/> Thêm Block nội dung
                </button>
            </div>

            {blocks.map((block, index) => (
                <div key={block.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 relative group">
                    {/* Header Block */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow mr-4">
                            <input 
                                type="text" 
                                value={block.title}
                                onChange={(e) => updateBlockField(block.id, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 font-bold text-lg text-gray-800 outline-none px-1"
                                placeholder={`Tiêu đề phần ${index + 1}...`}
                            />
                            <textarea 
                                value={block.description || ''}
                                onChange={(e) => updateBlockField(block.id, 'description', e.target.value)}
                                className="w-full mt-2 bg-transparent text-sm text-gray-600 outline-none resize-none border-b border-dashed border-gray-300 focus:border-indigo-500 py-1"
                                rows={2}
                                placeholder="Mô tả / Hướng dẫn (Markdown)..."
                            />
                        </div>
                        <button type="button" onClick={() => removeBlock(block.id)} className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 size={18} />
                        </button>
                    </div>

                    {/* Content Areas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 1. AUDIO COLUMN */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center">
                                <Headphones size={12} className="mr-1"/> Audio
                            </h4>
                            <div className="space-y-2 mb-3">
                                {block.audios?.map(audio => (
                                    <div key={audio.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs">
                                        <span className="truncate max-w-[100px]">{audio.name}</span>
                                        <button type="button" onClick={() => removeSubItem(block.id, 'audios', audio.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                            <label className={`cursor-pointer flex items-center justify-center p-2 border border-dashed border-indigo-200 rounded text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition ${uploading ? 'opacity-50' : ''}`}>
                                {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} className="mr-1"/>}
                                Upload Audio
                                <input type="file" accept="audio/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files && handleUpload(e.target.files[0], 'audio', block.id)}/>
                            </label>
                        </div>

                        {/* 2. IMAGE COLUMN */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center">
                                <ImageIcon size={12} className="mr-1"/> Hình ảnh
                            </h4>
                            <div className="space-y-2 mb-3">
                                {block.images?.map(img => (
                                    <div key={img.id} className="relative group/img rounded overflow-hidden bg-gray-100">
                                        <img src={img.url} className={`w-full h-12 object-cover ${img.isSpoiler ? 'blur-sm grayscale' : ''}`} alt="thumb"/>
                                        <div className="absolute top-0 right-0 flex bg-black/50 rounded-bl-lg">
                                            <button type="button" onClick={() => toggleSpoiler(block.id, img.id)} className="p-1 text-white hover:text-yellow-300" title="Toggle Spoiler">
                                                {img.isSpoiler ? <EyeOff size={10}/> : <Eye size={10}/>}
                                            </button>
                                            <button type="button" onClick={() => removeSubItem(block.id, 'images', img.id)} className="p-1 text-white hover:text-red-400">
                                                <X size={10}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <label className={`cursor-pointer flex items-center justify-center p-2 border border-dashed border-blue-200 rounded text-blue-600 text-xs font-bold hover:bg-blue-50 transition ${uploading ? 'opacity-50' : ''}`}>
                                {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} className="mr-1"/>}
                                Upload Ảnh
                                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files && handleUpload(e.target.files[0], 'image', block.id)}/>
                            </label>
                        </div>

                         {/* 3. QUIZ COLUMN */}
                         <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center">
                                <HelpCircle size={12} className="mr-1"/> Quiz Nhanh
                            </h4>
                            <div className="space-y-2 mb-3">
                                {block.quizzes?.map(q => (
                                    <div key={q.id} className="flex justify-between items-start bg-gray-50 p-2 rounded text-xs">
                                        <span className="line-clamp-2 text-gray-600 mr-1">{q.question}</span>
                                        <button type="button" onClick={() => removeSubItem(block.id, 'quizzes', q.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => addQuiz(block.id)} className="w-full flex items-center justify-center p-2 border border-dashed border-orange-200 rounded text-orange-600 text-xs font-bold hover:bg-orange-50 transition">
                                <Plus size={14} className="mr-1"/> Thêm câu hỏi
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            
            {blocks.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    Chưa có nội dung. Hãy bấm "Thêm Block" để bắt đầu.
                </div>
            )}
        </div>
    );
};

export default LessonBuilder;