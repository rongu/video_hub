import React, { useState } from 'react';
import { 
    Plus, Trash2, Image as ImageIcon, Headphones, HelpCircle, 
    UploadCloud, X, Loader2, Video, Languages, FileText // [NEW] Thêm icon FileText
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
    ref, uploadBytesResumable, getDownloadURL, getFirebaseStorage,
    type LessonBlock, type BlockAudio, type BlockImage, type BlockQuiz,
    type BlockVideo, type BlockVocabulary
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
    
    // [NEW] State quản lý UI Bulk Import cho từng block
    const [activeBulkBlockId, setActiveBulkBlockId] = useState<string | null>(null);
    const [bulkText, setBulkText] = useState('');

    const updateBlocks = (newBlocks: LessonBlock[]) => {
        setBlocks(newBlocks);
        onChange(newBlocks);
    };

    const addBlock = () => {
        const newBlock: LessonBlock = {
            id: uuidv4(),
            description: '',
            audios: [],
            videos: [],
            images: [],
            vocabularies: [],
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

    const toggleImageSpoiler = (blockId: string, imageId: string, currentStatus: boolean) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        
        const newImages = targetBlock.images?.map(img => 
            img.id === imageId ? { ...img, isSpoiler: !currentStatus } : img
        );
        updateBlockField(blockId, 'images', newImages);
    };

    const handleUpload = async (file: File, type: 'audio' | 'image' | 'video', blockId: string) => {
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
            } else if (type === 'image') {
                const newImage: BlockImage = { id: uuidv4(), url: downloadURL, caption: '', isSpoiler: false };
                updateBlockField(blockId, 'images', [...(targetBlock.images || []), newImage]);
            } else if (type === 'video') {
                const newVideo: BlockVideo = { id: uuidv4(), name: file.name, url: downloadURL };
                updateBlockField(blockId, 'videos', [...(targetBlock.videos || []), newVideo]);
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload thất bại!");
        } finally {
            setUploading(false);
        }
    };

    const removeSubItem = (blockId: string, type: 'audios' | 'images' | 'quizzes' | 'videos' | 'vocabularies', itemId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        const list = targetBlock[type] as any[];
        updateBlockField(blockId, type, list.filter(i => i.id !== itemId));
    };

    const addVocabulary = (blockId: string) => {
        const word = prompt("Nhập từ vựng (Word):");
        if (!word) return;
        const ipa = prompt("Nhập phiên âm (IPA):", "") || "";
        const meaningVi = prompt("Nghĩa Tiếng Việt:", "") || "";
        const meaningJa = prompt("Nghĩa Tiếng Nhật:", "") || "";

        const newVocab: BlockVocabulary = {
            id: uuidv4(),
            word,
            ipa,
            meaningVi,
            meaningJa
        };

        const targetBlock = blocks.find(b => b.id === blockId);
        if (targetBlock) {
            updateBlockField(blockId, 'vocabularies', [...(targetBlock.vocabularies || []), newVocab]);
        }
    };

    // [NEW] Logic Bulk Import
    const openBulkModal = (blockId: string) => {
        setActiveBulkBlockId(blockId);
        setBulkText('');
    };

    const handleBulkImport = (blockId: string) => {
        if (!bulkText.trim()) return;
        
        const newVocabs: BlockVocabulary[] = [];
        const lines = bulkText.split('\n');
        
        lines.forEach(line => {
            // Hỗ trợ định dạng: Word | IPA | Vi | Ja
            // Loại bỏ dấu | ở đầu/cuối nếu user copy từ markdown table
            const cleanLine = line.trim().replace(/^\||\|$/g, '');
            if (!cleanLine) return;

            const parts = cleanLine.split('|').map(p => p.trim());
            
            // Ít nhất phải có Word
            if (parts.length >= 1 && parts[0]) {
                 newVocabs.push({
                    id: uuidv4(),
                    word: parts[0] || '',
                    ipa: parts[1] || '',
                    meaningVi: parts[2] || '',
                    meaningJa: parts[3] || ''
                 });
            }
        });

        if (newVocabs.length > 0) {
             const targetBlock = blocks.find(b => b.id === blockId);
             if (targetBlock) {
                 updateBlockField(blockId, 'vocabularies', [...(targetBlock.vocabularies || []), ...newVocabs]);
             }
        }
        
        // Reset & Close
        setActiveBulkBlockId(null);
        setBulkText('');
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 italic">Kéo xuống để xem thêm nội dung.</p>
                <button type="button" onClick={addBlock} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-200 flex items-center">
                    <Plus size={16} className="mr-2"/> Thêm Block nội dung
                </button>
            </div>

            {blocks.map((block) => (
                <div key={block.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 relative group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow mr-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        
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

                        {/* 2. VIDEO COLUMN */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center"><Video size={12} className="mr-1"/> Video</h4>
                            <div className="space-y-2 mb-3">
                                {block.videos?.map(video => (
                                    <div key={video.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs">
                                        <span className="truncate max-w-[100px]">{video.name}</span>
                                        <button type="button" onClick={() => removeSubItem(block.id, 'videos', video.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                            <label className={`cursor-pointer flex items-center justify-center p-2 border border-dashed border-pink-200 rounded text-pink-600 text-xs font-bold hover:bg-pink-50 transition ${uploading ? 'opacity-50' : ''}`}>
                                {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} className="mr-1"/>} Upload Video
                                <input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files && handleUpload(e.target.files[0], 'video', block.id)}/>
                            </label>
                        </div>

                        {/* 3. IMAGE COLUMN */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center"><ImageIcon size={12} className="mr-1"/> Hình ảnh</h4>
                            
                            <div className="space-y-3 mb-3">
                                {block.images?.map(img => (
                                    <div key={img.id} className="bg-gray-50 p-2 rounded border border-gray-100 relative group/img">
                                        <div className="rounded overflow-hidden mb-2">
                                            <img src={img.url} className="w-full h-24 object-contain bg-white" alt="thumb" />
                                        </div>

                                        <div className="flex items-center mt-2 p-1 bg-gray-100 rounded border border-gray-200">
                                            <input 
                                                id={`spoiler-${img.id}`}
                                                type="checkbox"
                                                checked={img.isSpoiler || false}
                                                onChange={() => toggleImageSpoiler(block.id, img.id, img.isSpoiler || false)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <label htmlFor={`spoiler-${img.id}`} className="ml-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                                                Che ảnh này
                                            </label>
                                        </div>

                                        <button type="button" onClick={() => removeSubItem(block.id, 'images', img.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition" title="Xóa ảnh này">
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

                         {/* 4. VOCABULARY COLUMN [MODIFIED] */}
                         <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center"><Languages size={12} className="mr-1"/> Từ vựng</h4>
                            
                            {/* Danh sách từ vựng đã thêm */}
                            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto custom-scrollbar">
                                {block.vocabularies?.map(vocab => (
                                    <div key={vocab.id} className="bg-gray-50 p-2 rounded text-xs relative group/vocab border border-gray-100">
                                        <p className="font-bold text-indigo-700 text-sm">{vocab.word} <span className="text-gray-400 font-normal text-xs">/{vocab.ipa}/</span></p>
                                        <p className="text-gray-600 mt-1 truncate">🇻🇳 {vocab.meaningVi}</p>
                                        <p className="text-gray-600 truncate">🇯🇵 {vocab.meaningJa}</p>
                                        
                                        <button type="button" onClick={() => removeSubItem(block.id, 'vocabularies', vocab.id)} className="absolute top-1 right-1 text-red-400 hover:text-red-600">
                                            <X size={12}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            {/* [NEW UI] Khu vực Toggle giữa Add Single và Bulk Add */}
                            {activeBulkBlockId === block.id ? (
                                <div className="bg-gray-50 p-2 rounded border border-gray-200 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Nhập Markdown</span>
                                        <span className="text-[10px] text-gray-400 italic">Word | IPA | VN | JP</span>
                                    </div>
                                    <textarea 
                                        className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none font-mono"
                                        rows={4}
                                        placeholder={`Apple | /ap/ | Táo | リンゴ\nSchool | /sk/ | Trường | 学校`}
                                        value={bulkText}
                                        onChange={(e) => setBulkText(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setActiveBulkBlockId(null)} className="flex-1 py-1 bg-gray-200 text-gray-600 rounded text-xs font-bold hover:bg-gray-300">Hủy</button>
                                        <button onClick={() => handleBulkImport(block.id)} className="flex-1 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700">Lưu ngay</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {/* Nút thêm từng từ (Popup cũ) */}
                                    <button type="button" onClick={() => addVocabulary(block.id)} className="w-full flex items-center justify-center p-2 border border-dashed border-indigo-200 rounded text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition">
                                        <Plus size={14} className="mr-1"/> Thêm 1 từ (Popup)
                                    </button>
                                    
                                    {/* Nút nhập hàng loạt (Mới - Rõ ràng hơn) */}
                                    <button type="button" onClick={() => openBulkModal(block.id)} className="w-full flex items-center justify-center p-2 border border-dashed border-green-300 rounded text-green-700 text-xs font-bold hover:bg-green-50 transition bg-green-50/30">
                                        <FileText size={14} className="mr-1"/> Nhập nhiều (Markdown)
                                    </button>
                                </div>
                            )}
                        </div>

                         {/* 5. QUIZ COLUMN */}
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