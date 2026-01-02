import React, { useState } from 'react';
import { 
    Plus, Trash2, Image as ImageIcon, Headphones, HelpCircle, 
    UploadCloud, X, Loader2 
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
    ref, uploadBytesResumable, getDownloadURL, getFirebaseStorage,
    type LessonBlock, type BlockAudio, type BlockImage, type BlockQuiz 
} from '../../services/firebase';

interface LessonBuilderProps {
    courseId: string;
    lessonId: string; 
    initialBlocks?: LessonBlock[];
    onChange: (blocks: LessonBlock[]) => void;
}

const LessonBuilder: React.FC<LessonBuilderProps> = ({ courseId, lessonId, initialBlocks = [], onChange }) => {
    const [blocks, setBlocks] = useState<LessonBlock[]>(initialBlocks);
    const [uploading, setUploading] = useState(false);

    const updateBlocks = (newBlocks: LessonBlock[]) => {
        setBlocks(newBlocks);
        onChange(newBlocks);
    };

    // [UPDATED] Hàm addBlock nhận index để chèn vào vị trí cụ thể
    // index = -1: Thêm vào danh sách trống
    // index >= 0: Chèn vào sau vị trí index
    const addBlock = (index: number) => {
        const newBlock: LessonBlock = {
            id: uuidv4(),
            description: '',
            audios: [],
            images: [],
            quizzes: []
        };

        if (index === -1 && blocks.length === 0) {
            updateBlocks([newBlock]);
        } else {
            const newBlocks = [...blocks];
            // Chèn newBlock vào ngay sau vị trí index
            newBlocks.splice(index + 1, 0, newBlock);
            updateBlocks(newBlocks);
        }
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

    // Hàm toggle checkbox Spoiler (Giữ nguyên từ code của bạn)
    const toggleImageSpoiler = (blockId: string, imageId: string, currentStatus: boolean) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        
        const newImages = targetBlock.images?.map(img => 
            img.id === imageId ? { ...img, isSpoiler: !currentStatus } : img
        );
        updateBlockField(blockId, 'images', newImages);
    };

    const handleUpload = async (file: File, type: 'audio' | 'image', blockId: string) => {
        if (!file) return;
        setUploading(true);
        try {
            const filePath = `artifacts/video-hub-prod-id/assets/${courseId}/${lessonId}/${uuidv4()}_${file.name}`;
            const storageRef = ref(getFirebaseStorage(), filePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', null, reject, () => resolve());
            });
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

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

    const removeSubItem = (blockId: string, type: 'audios' | 'images' | 'quizzes', itemId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        const list = targetBlock[type] as any[];
        updateBlockField(blockId, type, list.filter(i => i.id !== itemId));
    };

    const addQuiz = (blockId: string) => {
        const question = prompt("Nhập câu hỏi:");
        if (!question) return;
        const ansStr = prompt("Nhập các đáp án (ngăn cách bởi dấu phẩy):");
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
        <div className="space-y-4">
            
            {/* [UPDATED] Nút thêm block đầu tiên khi danh sách trống */}
            {blocks.length === 0 && (
                <div 
                    className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer"
                    onClick={() => addBlock(-1)}
                >
                    <p>Chưa có nội dung.</p>
                    <button type="button" className="mt-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm flex items-center mx-auto">
                        <Plus size={16} className="mr-2"/> Thêm Block đầu tiên
                    </button>
                </div>
            )}

            {blocks.map((block, index) => (
                <div key={block.id}>
                    {/* BLOCK CONTENT */}
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 relative group shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-grow mr-4">
                                <textarea 
                                    value={block.description || ''}
                                    onChange={(e) => updateBlockField(block.id, 'description', e.target.value)}
                                    className="w-full mt-2 bg-transparent text-sm text-gray-800 outline-none resize-none border-b border-dashed border-gray-300 focus:border-indigo-500 py-1 font-medium"
                                    rows={2}
                                    placeholder="Mô tả / Hướng dẫn (Markdown)..."
                                />
                            </div>
                            <button type="button" onClick={() => removeBlock(block.id)} className="text-gray-400 hover:text-red-500 p-1">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* 1. AUDIO COLUMN */}
                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center"><Headphones size={12} className="mr-1"/> Audio</h4>
                                <div className="space-y-2 mb-3">
                                    {block.audios?.map(audio => (
                                        <div key={audio.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs">
                                            <span className="truncate max-w-[100px]">{audio.name}</span>
                                            <button type="button" onClick={() => removeSubItem(block.id, 'audios', audio.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                                <label className={`cursor-pointer flex items-center justify-center p-2 border border-dashed border-indigo-200 rounded text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition ${uploading ? 'opacity-50' : ''}`}>
                                    {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} className="mr-1"/>} Upload Audio
                                    <input type="file" accept="audio/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files && handleUpload(e.target.files[0], 'audio', block.id)}/>
                                </label>
                            </div>

                            {/* 2. IMAGE COLUMN */}
                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center"><ImageIcon size={12} className="mr-1"/> Hình ảnh</h4>
                                
                                <div className="space-y-3 mb-3">
                                    {block.images?.map(img => (
                                        <div key={img.id} className="bg-gray-50 p-2 rounded border border-gray-100 relative group/img">
                                            {/* Hiển thị ảnh */}
                                            <div className="rounded overflow-hidden mb-2">
                                                <img src={img.url} className="w-full h-24 object-contain bg-white" alt="thumb" />
                                            </div>

                                            {/* Checkbox Spoiler */}
                                            <div className="flex items-center mt-2 p-1 bg-gray-100 rounded border border-gray-200">
                                                <input 
                                                    id={`spoiler-${img.id}`}
                                                    type="checkbox"
                                                    checked={img.isSpoiler || false}
                                                    onChange={() => toggleImageSpoiler(block.id, img.id, img.isSpoiler || false)}
                                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <label htmlFor={`spoiler-${img.id}`} className="ml-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                                                    Che ảnh này (Spoiler)
                                                </label>
                                            </div>

                                            {/* Nút Xóa */}
                                            <button 
                                                type="button" 
                                                onClick={() => removeSubItem(block.id, 'images', img.id)} 
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"
                                                title="Xóa ảnh này"
                                            >
                                                <X size={12}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <label className={`cursor-pointer flex items-center justify-center p-2 border border-dashed border-blue-200 rounded text-blue-600 text-xs font-bold hover:bg-blue-50 transition ${uploading ? 'opacity-50' : ''}`}>
                                    {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} className="mr-1"/>} Upload Ảnh
                                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files && handleUpload(e.target.files[0], 'image', block.id)}/>
                                </label>
                            </div>

                             {/* 3. QUIZ COLUMN */}
                             <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center"><HelpCircle size={12} className="mr-1"/> Quiz Nhanh</h4>
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

                    {/* [UPDATED] Nút chèn block mới (+ Insert) nằm sau mỗi block */}
                    <div className="relative py-2 group cursor-pointer" onClick={() => addBlock(index)}>
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t-2 border-dashed border-gray-200 group-hover:border-indigo-300 transition-colors"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <button 
                                type="button"
                                className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-500 shadow-sm hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:scale-110 transition-all duration-200"
                            >
                                <Plus size={14} className="mr-1"/> Chèn Block
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LessonBuilder;