import React, { useState, useEffect } from 'react';
import {
    FileLock2, Plus, Trash2, Download, Eye, X, Loader2, Check, ShieldCheck, FileText,
} from 'lucide-react';
import { type User } from 'firebase/auth';
import {
    subscribeToSecureContents,
    addSecureContent,
    deleteSecureContent,
    decryptSecureContent,
    triggerTextDownload,
    suggestedFilename,
    type SecureContent,
    type SecureContentFormat,
} from '../../services/firebase/secureContents';
import { MarkdownContent } from '../common/markdownUtils';

const formatDate = (ms: number) =>
    new Date(ms).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Form tạo nội dung mới
// ─────────────────────────────────────────────────────────────────────────────

const CreateContentForm: React.FC<{
    adminId: string;
    onClose: () => void;
}> = ({ adminId, onClose }) => {
    const [title, setTitle] = useState('');
    const [format, setFormat] = useState<SecureContentFormat>('markdown');
    const [body, setBody] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
        if (!body.trim()) { setError('Nội dung đang trống.'); return; }
        setLoading(true);
        setError('');
        try {
            await addSecureContent(title, format, body, adminId);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi khi lưu nội dung.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
                <div className="p-5 text-white flex items-center justify-between" style={{ background: 'linear-gradient(195deg, #49A3F1, #1A73E8)' }}>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileLock2 size={20} /> Thêm nội dung mã hoá
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full transition"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="argon-input w-full" placeholder="Ví dụ: Ghi chú nội bộ tháng 9" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Định dạng</label>
                        <div className="flex gap-2">
                            {(['text', 'markdown'] as const).map(f => (
                                <button type="button" key={f} onClick={() => setFormat(f)}
                                    className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition ${
                                        format === f ? 'border-[#1A73E8] bg-blue-50 text-[#1A73E8]' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                                    }`}>
                                    <FileText size={15} />
                                    {f === 'markdown' ? 'Markdown' : 'Text thường'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-gray-600">Nội dung <span className="text-red-500">*</span></label>
                            {format === 'markdown' && (
                                <button type="button" onClick={() => setShowPreview(p => !p)} className="text-xs font-semibold text-[#1A73E8] hover:underline">
                                    {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
                                </button>
                            )}
                        </div>
                        {showPreview && format === 'markdown' ? (
                            <div className="border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto bg-white">
                                {body.trim() ? <MarkdownContent content={body} /> : <p className="text-gray-400 text-sm">Chưa có nội dung.</p>}
                            </div>
                        ) : (
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={12}
                                className="argon-input w-full font-mono text-sm leading-relaxed"
                                placeholder={format === 'markdown' ? '# Tiêu đề\n\nNội dung markdown...' : 'Nhập nội dung text bất kỳ...'}
                            />
                        )}
                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                            <ShieldCheck size={12} /> Nội dung được mã hoá AES-256 ngay trên trình duyệt (key lưu riêng, chỉ admin đọc) trước khi gửi lên server.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 argon-button-gradient flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {loading ? 'Đang mã hoá & lưu...' : 'Lưu nội dung'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal xem nội dung đã giải mã
// ─────────────────────────────────────────────────────────────────────────────

const ViewContentModal: React.FC<{
    item: SecureContent;
    onClose: () => void;
}> = ({ item, onClose }) => {
    const [content, setContent] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        decryptSecureContent(item)
            .then(text => { if (alive) setContent(text); })
            .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Không giải mã được nội dung.'); });
        return () => { alive = false; };
    }, [item]);

    return (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 min-w-0">
                        <Eye size={18} className="text-[#1A73E8] flex-shrink-0" />
                        <span className="truncate">{item.title}</span>
                    </h3>
                    <button onClick={onClose} className="hover:bg-gray-100 p-1.5 rounded-full transition"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    {!error && content === null && (
                        <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                            <Loader2 size={20} className="animate-spin" /> Đang giải mã...
                        </div>
                    )}
                    {content !== null && (
                        item.format === 'markdown'
                            ? <MarkdownContent content={content} />
                            : <pre className="whitespace-pre-wrap break-words text-sm text-gray-700 font-mono leading-relaxed">{content}</pre>
                    )}
                </div>

                {content !== null && (
                    <div className="p-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={() => triggerTextDownload(suggestedFilename(item), content)}
                            className="argon-button-gradient flex items-center gap-2 text-sm"
                        >
                            <Download size={16} /> Tải file
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Trang chính
// ─────────────────────────────────────────────────────────────────────────────

const SecureContentPage: React.FC<{ user: User }> = ({ user }) => {
    const [items, setItems] = useState<SecureContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [viewing, setViewing] = useState<SecureContent | null>(null);
    const [deleting, setDeleting] = useState<SecureContent | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rowError, setRowError] = useState('');

    useEffect(() => {
        const unsub = subscribeToSecureContents((list) => {
            setItems(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleDownload = async (item: SecureContent) => {
        setBusyId(item.id);
        setRowError('');
        try {
            const text = await decryptSecureContent(item);
            triggerTextDownload(suggestedFilename(item), text);
        } catch (err) {
            setRowError(err instanceof Error ? err.message : 'Không tải được nội dung.');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setDeleteLoading(true);
        try {
            await deleteSecureContent(deleting);
            setDeleting(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <FileLock2 size={20} className="text-[#1A73E8]" /> Nội dung mã hoá
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {items.length} mục · Lưu dạng mã hoá trên server, giải mã khi xem / tải xuống
                    </p>
                </div>
                <button onClick={() => setShowCreate(true)} className="argon-button-gradient flex items-center gap-2">
                    <Plus size={18} /> Thêm nội dung
                </button>
            </div>

            {rowError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{rowError}</p>}

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A73E8]"></div></div>
            ) : items.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <FileLock2 size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Chưa có nội dung nào</p>
                    <p className="text-gray-400 text-sm mt-1">Thêm text hoặc markdown, hệ thống sẽ mã hoá và lưu lại</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    {items.map(item => (
                        <div key={item.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1A73E8] flex items-center justify-center flex-shrink-0">
                                <FileText size={16} />
                            </div>
                            <div className="min-w-0 flex-grow">
                                <p className="font-semibold text-gray-700 truncate">{item.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    <span className="uppercase font-medium">{item.format}</span>
                                    {' · '}{formatSize(item.size)}
                                    {' · '}{formatDate(item.createdAt)}
                                </p>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                                <button onClick={() => setViewing(item)} title="Xem"
                                    className="p-2 text-gray-400 hover:text-[#1A73E8] hover:bg-blue-50 rounded-lg transition">
                                    <Eye size={16} />
                                </button>
                                <button onClick={() => handleDownload(item)} disabled={busyId === item.id} title="Tải xuống"
                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50">
                                    {busyId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                </button>
                                <button onClick={() => setDeleting(item)} title="Xoá"
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateContentForm adminId={user.uid} onClose={() => setShowCreate(false)} />
            )}

            {viewing && (
                <ViewContentModal item={viewing} onClose={() => setViewing(null)} />
            )}

            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <h3 className="font-bold text-gray-700 text-lg">Xoá nội dung?</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                "{deleting.title}" sẽ bị xoá khỏi server. Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleting(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                                Hủy
                            </button>
                            <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2">
                                {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Xoá
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureContentPage;
