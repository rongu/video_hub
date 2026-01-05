import React, { useState } from 'react';
import { 
    Plus, Trash2, Image as ImageIcon, Headphones, HelpCircle, 
    UploadCloud, X, Loader2, Video, Languages, FileText, Table as TableIcon
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
    ref, uploadBytesResumable, getDownloadURL, getFirebaseStorage,
    type LessonBlock, type BlockAudio, type BlockImage, type BlockQuiz,
    type BlockVideo, type BlockVocabulary, type BlockVocabularyGroup
} from '../../services/firebase';

interface LessonBuilderProps {
    courseId: string;
    lessonId: string; 
    initialBlocks?: LessonBlock[];
    onChange: (blocks: LessonBlock[]) => void;
}

const LessonBuilder: React.FC<LessonBuilderProps> = ({ courseId, lessonId, initialBlocks = [], onChange }) => {
    // [MIGRATION] Tự động chuyển data cũ (vocabularies phẳng) sang data mới (groups) ngay khi load
    const migrateBlocks = (blocks: LessonBlock[]) => {
        return blocks.map(b => {
            const hasLegacyVocab = b.vocabularies && b.vocabularies.length > 0;
            const hasGroups = b.vocabularyGroups && b.vocabularyGroups.length > 0;
            
            if (hasLegacyVocab && !hasGroups) {
                // Tạo group mặc định từ data cũ
                return {
                    ...b,
                    vocabularies: [], // Clear legacy
                    vocabularyListTitle: '',
                    vocabularyGroups: [{
                        id: uuidv4(),
                        title: b.vocabularyListTitle || 'Từ vựng (Default)',
                        vocabularies: b.vocabularies || []
                    }]
                };
            }
            // Đảm bảo luôn có mảng groups
            if (!b.vocabularyGroups) {
                return { ...b, vocabularyGroups: [] };
            }
            return b;
        });
    };

    const [blocks, setBlocks] = useState<LessonBlock[]>(migrateBlocks(initialBlocks));
    const [uploading, setUploading] = useState(false);
    
    // [NEW] State Bulk Import: Lưu { blockId, groupId }
    const [activeBulk, setActiveBulk] = useState<{ blockId: string, groupId: string } | null>(null);
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
            vocabularyGroups: [], // Init empty groups
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

    // --- SUB ITEM HANDLERS ---

    const removeSubItem = (blockId: string, type: 'audios' | 'images' | 'quizzes' | 'videos', itemId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        const list = targetBlock[type] as any[];
        updateBlockField(blockId, type, list.filter(i => i.id !== itemId));
    };

    // --- VOCABULARY GROUP HANDLERS ---

    const addVocabularyGroup = (blockId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;

        const newGroup: BlockVocabularyGroup = {
            id: uuidv4(),
            title: '', // Để trống cho user nhập
            vocabularies: []
        };
        
        updateBlockField(blockId, 'vocabularyGroups', [...(targetBlock.vocabularyGroups || []), newGroup]);
    };

    const removeVocabularyGroup = (blockId: string, groupId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        if (!confirm('Xóa bảng từ vựng này?')) return;
        
        const newGroups = (targetBlock.vocabularyGroups || []).filter(g => g.id !== groupId);
        updateBlockField(blockId, 'vocabularyGroups', newGroups);
    };

    const updateGroupTitle = (blockId: string, groupId: string, newTitle: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        
        const newGroups = (targetBlock.vocabularyGroups || []).map(g => 
            g.id === groupId ? { ...g, title: newTitle } : g
        );
        updateBlockField(blockId, 'vocabularyGroups', newGroups);
    };

    const removeVocabFromGroup = (blockId: string, groupId: string, vocabId: string) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        
        const newGroups = (targetBlock.vocabularyGroups || []).map(g => {
            if (g.id === groupId) {
                return { ...g, vocabularies: g.vocabularies.filter(v => v.id !== vocabId) };
            }
            return g;
        });
        updateBlockField(blockId, 'vocabularyGroups', newGroups);
    };

    const addVocabToGroup = (blockId: string, groupId: string) => {
        const word = prompt("Nhập từ vựng (Word):");
        if (!word) return;
        const ipa = prompt("Nhập phiên âm (IPA):", "") || "";
        const meaningVi = prompt("Nghĩa Tiếng Việt:", "") || "";
        const meaningJa = prompt("Nghĩa Tiếng Nhật:", "") || "";
        const note = prompt("Ghi chú (Note):", "") || "";

        const newVocab: BlockVocabulary = { id: uuidv4(), word, ipa, meaningVi, meaningJa, note };

        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;

        const newGroups = (targetBlock.vocabularyGroups || []).map(g => {
            if (g.id === groupId) {
                return { ...g, vocabularies: [...g.vocabularies, newVocab] };
            }
            return g;
        });
        updateBlockField(blockId, 'vocabularyGroups', newGroups);
    };

    // --- BULK IMPORT HANDLERS ---

    const openBulkModal = (blockId: string, groupId: string) => {
        setActiveBulk({ blockId, groupId });
        setBulkText('');
    };

    const handleBulkImport = () => {
        if (!activeBulk || !bulkText.trim()) return;
        const { blockId, groupId } = activeBulk;
        
        const newVocabs: BlockVocabulary[] = [];
        const lines = bulkText.split('\n');
        
        lines.forEach(line => {
            const cleanLine = line.trim().replace(/^\||\|$/g, '');
            if (!cleanLine) return;
            const parts = cleanLine.split('|').map(p => p.trim());
            
            if (parts.length >= 1 && parts[0]) {
                 newVocabs.push({
                    id: uuidv4(),
                    word: parts[0] || '',
                    ipa: parts[1] || '',
                    meaningVi: parts[2] || '',
                    meaningJa: parts[3] || '',
                    note: parts[4] || ''
                 });
            }
        });

        if (newVocabs.length > 0) {
             const targetBlock = blocks.find(b => b.id === blockId);
             if (targetBlock) {
                 const newGroups = (targetBlock.vocabularyGroups || []).map(g => {
                    if (g.id === groupId) {
                        return { ...g, vocabularies: [...g.vocabularies, ...newVocabs] };
                    }
                    return g;
                 });
                 updateBlockField(blockId, 'vocabularyGroups', newGroups);
             }
        }
        
        setActiveBulk(null);
        setBulkText('');
    };

    // --- OTHER MEDIA HANDLERS ---
    
    const toggleImageSpoiler = (blockId: string, imageId: string, currentStatus: boolean) => {
        const targetBlock = blocks.find(b => b.id === blockId);
        if (!targetBlock) return;
        const newImages = targetBlock.images?.map(img => img.id === imageId ? { ...img, isSpoiler: !currentStatus } : img);
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
                        
                        {/* 1. AUDIO */}
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

                        {/* 2. VIDEO */}
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

                        {/* 3. IMAGES */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center"><ImageIcon size={12} className="mr-1"/> Hình ảnh</h4>
                            <div className="space-y-3 mb-3">
                                {block.images?.map(img => (
                                    <div key={img.id} className="bg-gray-50 p-2 rounded border border-gray-100 relative group/img">
                                        <div className="rounded overflow-hidden mb-2">
                                            <img src={img.url} className="w-full h-24 object-contain bg-white" alt="thumb" />
                                        </div>
                                        <div className="flex items-center mt-2 p-1 bg-gray-100 rounded border border-gray-200">
                                            <input id={`spoiler-${img.id}`} type="checkbox" checked={img.isSpoiler || false} onChange={() => toggleImageSpoiler(block.id, img.id, img.isSpoiler || false)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"/>
                                            <label htmlFor={`spoiler-${img.id}`} className="ml-2 text-xs font-bold text-gray-700 cursor-pointer select-none">Che ảnh này</label>
                                        </div>
                                        <button type="button" onClick={() => removeSubItem(block.id, 'images', img.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                            <label className={`cursor-pointer flex items-center justify-center p-2 border border-dashed border-blue-200 rounded text-blue-600 text-xs font-bold hover:bg-blue-50 transition ${uploading ? 'opacity-50' : ''}`}>
                                {uploading ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} className="mr-1"/>} Upload Ảnh
                                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files && handleUpload(e.target.files[0], 'image', block.id)}/>
                            </label>
                        </div>

                        {/* 4. VOCABULARY COLUMNS (MULTI-TABLE) */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm col-span-1 md:col-span-2 xl:col-span-2"> 
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center">
                                    <Languages size={12} className="mr-1"/> Từ vựng (Nhiều bảng)
                                </h4>
                            </div>

                            {/* List of Vocabulary Groups */}
                            <div className="space-y-4">
                                {block.vocabularyGroups?.map((group) => (
                                    <div key={group.id} className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/20 relative">
                                        {/* Header của Group: Title + Delete */}
                                        <div className="flex gap-2 mb-3">
                                            <input 
                                                type="text" 
                                                placeholder="Tiêu đề bảng này (VD: Động từ)..."
                                                className="flex-grow text-sm font-bold border-b border-indigo-200 bg-transparent focus:border-indigo-500 outline-none text-indigo-900 placeholder-indigo-300"
                                                value={group.title || ''}
                                                onChange={(e) => updateGroupTitle(block.id, group.id, e.target.value)}
                                            />
                                            <button 
                                                type="button" /* [FIX] Thêm type button */
                                                onClick={() => removeVocabularyGroup(block.id, group.id)}
                                                className="text-gray-400 hover:text-red-500"
                                                title="Xóa bảng này"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>

                                        {/* Table Data */}
                                        <div className="mb-3 max-h-48 overflow-y-auto custom-scrollbar border border-white bg-white rounded shadow-sm">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-2 text-[10px] font-bold text-gray-500 uppercase border-b">Word/IPA</th>
                                                        <th className="p-2 text-[10px] font-bold text-gray-500 uppercase border-b">Meaning</th>
                                                        <th className="p-2 text-[10px] font-bold text-gray-500 uppercase border-b">Note</th>
                                                        <th className="p-2 w-6 border-b"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-xs">
                                                    {group.vocabularies.map((vocab) => (
                                                        <tr key={vocab.id} className="border-b last:border-0 hover:bg-gray-50">
                                                            <td className="p-2 align-top">
                                                                <div className="font-bold text-indigo-700">{vocab.word}</div>
                                                                <div className="text-gray-400 text-[10px]">/{vocab.ipa}/</div>
                                                            </td>
                                                            <td className="p-2 align-top">
                                                                <div>🇻🇳 {vocab.meaningVi}</div>
                                                                <div className="text-gray-500">🇯🇵 {vocab.meaningJa}</div>
                                                            </td>
                                                            <td className="p-2 align-top text-gray-500 italic">{vocab.note}</td>
                                                            <td className="p-2 align-top text-center">
                                                                <button type="button" onClick={() => removeVocabFromGroup(block.id, group.id, vocab.id)} className="text-gray-300 hover:text-red-500"><X size={12}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {group.vocabularies.length === 0 && (
                                                        <tr><td colSpan={4} className="p-4 text-center text-gray-400 italic text-[10px]">Chưa có từ nào. Nhập thủ công hoặc Paste markdown.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Actions for THIS Group */}
                                        {activeBulk?.blockId === block.id && activeBulk.groupId === group.id ? (
                                            <div className="bg-white p-2 rounded border border-green-200 animate-in slide-in-from-top-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-bold text-green-700 uppercase">Paste Markdown vào bảng "{group.title || 'Không tên'}"</span>
                                                    <span className="text-[10px] text-gray-400 italic">Word | IPA | VN | JP | Note</span>
                                                </div>
                                                <textarea 
                                                    className="w-full text-xs p-2 border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none font-mono mb-2"
                                                    rows={3}
                                                    autoFocus
                                                    value={bulkText}
                                                    onChange={(e) => setBulkText(e.target.value)}
                                                    placeholder="Apple | /ap/ | Táo | ... | Note"
                                                />
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setActiveBulk(null)} className="flex-1 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200">Hủy</button>
                                                    <button type="button" onClick={handleBulkImport} className="flex-1 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700">Lưu vào bảng</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => addVocabToGroup(block.id, group.id)} className="flex-1 py-1.5 border border-dashed border-indigo-300 rounded text-indigo-600 text-[10px] font-bold hover:bg-indigo-50 flex items-center justify-center">
                                                    <Plus size={12} className="mr-1"/> Thêm 1 từ
                                                </button>
                                                <button type="button" onClick={() => openBulkModal(block.id, group.id)} className="flex-1 py-1.5 border border-dashed border-green-400 rounded text-green-700 text-[10px] font-bold hover:bg-green-50 flex items-center justify-center">
                                                    <FileText size={12} className="mr-1"/> Paste Markdown
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Button Add New Group */}
                            <button 
                                type="button" /* [FIX] Thêm type button */
                                onClick={() => addVocabularyGroup(block.id)} 
                                className="w-full mt-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-xs font-bold hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center"
                            >
                                <TableIcon size={14} className="mr-1"/> Tạo bảng từ vựng mới
                            </button>
                        </div>

                         {/* 5. QUIZ */}
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
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">Chưa có nội dung.</div>
            )}
        </div>
    );
};

export default LessonBuilder;