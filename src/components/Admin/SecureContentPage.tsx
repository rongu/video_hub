import React, { useState, useEffect, useMemo } from 'react';
import {
    FileLock2, Plus, Trash2, Download, Eye, X, Loader2, Check, FileText, Lock,
    Folder, FolderPlus, FolderInput, ChevronRight, Home, Pencil,
} from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, type User } from 'firebase/auth';
import {
    subscribeToSecureContents,
    subscribeToSecureFolders,
    addSecureContent,
    deleteSecureContent,
    moveSecureContent,
    createSecureFolder,
    renameSecureFolder,
    deleteSecureFolder,
    decryptSecureContent,
    triggerTextDownload,
    suggestedFilename,
    type SecureContent,
    type SecureContentFormat,
    type SecureFolder,
} from '../../services/firebase/secureContents';
import { MarkdownContent } from '../common/markdownUtils';

const formatDate = (ms: number) =>
    new Date(ms).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Duyệt cây thư mục (DFS từ gốc) -> danh sách phẳng có độ sâu, dùng cho dropdown/picker. */
const buildFolderTree = (folders: SecureFolder[]): { id: string; name: string; depth: number }[] => {
    const byParent = new Map<string | null, SecureFolder[]>();
    folders.forEach(f => {
        const key = f.parentId ?? null;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(f);
    });
    const out: { id: string; name: string; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
        (byParent.get(parentId) ?? []).forEach(f => {
            out.push({ id: f.id, name: f.name, depth });
            walk(f.id, depth + 1);
        });
    };
    walk(null, 0);
    return out;
};

/** Đường dẫn breadcrumb từ gốc tới folder hiện tại. */
const buildBreadcrumb = (folders: SecureFolder[], folderId: string | null): SecureFolder[] => {
    const byId = new Map(folders.map(f => [f.id, f]));
    const path: SecureFolder[] = [];
    let cur = folderId ? byId.get(folderId) : undefined;
    while (cur) {
        path.unshift(cur);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path;
};

// ─────────────────────────────────────────────────────────────────────────────
// Form tạo nội dung mới
// ─────────────────────────────────────────────────────────────────────────────

const CreateContentForm: React.FC<{
    adminId: string;
    folderId: string | null;
    onClose: () => void;
}> = ({ adminId, folderId, onClose }) => {
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
            await addSecureContent(title, format, body, adminId, folderId);
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
// Form tạo / đổi tên thư mục
// ─────────────────────────────────────────────────────────────────────────────

const FolderFormModal: React.FC<{
    initialName?: string;
    title: string;
    submitLabel: string;
    onSubmit: (name: string) => Promise<void>;
    onClose: () => void;
}> = ({ initialName = '', title, submitLabel, onSubmit, onClose }) => {
    const [name, setName] = useState(initialName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Vui lòng nhập tên thư mục.'); return; }
        setLoading(true);
        setError('');
        try {
            await onSubmit(name);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi khi lưu thư mục.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-5 text-white flex items-center gap-2" style={{ background: 'linear-gradient(195deg, #49A3F1, #1A73E8)' }}>
                    <Folder size={18} /> <h3 className="font-bold text-lg">{title}</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    <input
                        type="text"
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="argon-input w-full"
                        placeholder="Tên thư mục"
                    />
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 argon-button-gradient flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal chuyển nội dung sang thư mục khác
// ─────────────────────────────────────────────────────────────────────────────

const MoveContentModal: React.FC<{
    item: SecureContent;
    folders: SecureFolder[];
    onClose: () => void;
}> = ({ item, folders, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const tree = useMemo(() => buildFolderTree(folders), [folders]);

    const handleMove = async (folderId: string | null) => {
        setLoading(true);
        setError('');
        try {
            await moveSecureContent(item.id, folderId);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không chuyển được.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[80vh] flex flex-col">
                <div className="p-5 text-white flex items-center justify-between" style={{ background: 'linear-gradient(195deg, #49A3F1, #1A73E8)' }}>
                    <h3 className="font-bold text-lg flex items-center gap-2 min-w-0">
                        <FolderInput size={18} className="flex-shrink-0" /> <span className="truncate">Chuyển "{item.title}"</span>
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full transition flex-shrink-0"><X size={20} /></button>
                </div>
                <div className="p-3 overflow-y-auto flex-grow">
                    {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-2">{error}</p>}
                    <button
                        type="button"
                        disabled={loading || item.folderId === null}
                        onClick={() => handleMove(null)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        <Home size={16} className="text-gray-400" /> Thư mục gốc
                    </button>
                    {tree.map(f => (
                        <button
                            key={f.id}
                            type="button"
                            disabled={loading || item.folderId === f.id}
                            onClick={() => handleMove(f.id)}
                            style={{ paddingLeft: `${12 + f.depth * 18}px` }}
                            className="w-full flex items-center gap-2 py-2.5 pr-3 rounded-lg text-sm font-medium text-left hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <Folder size={16} className="text-amber-500 flex-shrink-0" /> <span className="truncate">{f.name}</span>
                        </button>
                    ))}
                    {tree.length === 0 && (
                        <p className="text-sm text-gray-400 px-3 py-2">Chưa có thư mục nào khác — tạo thư mục trước đã nhé.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal xác nhận mật khẩu (yêu cầu trước khi Xem / Tải xuống)
// ─────────────────────────────────────────────────────────────────────────────

const PasswordConfirmModal: React.FC<{
    user: User;
    actionLabel: string;
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ user, actionLabel, onSuccess, onCancel }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.email) { setError('Tài khoản không có email để xác thực.'); return; }
        if (!password) { setError('Vui lòng nhập mật khẩu.'); return; }
        setLoading(true);
        setError('');
        try {
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
            onSuccess();
        } catch (err) {
            const code = (err as { code?: string }).code;
            setError(
                code === 'auth/wrong-password' || code === 'auth/invalid-credential'
                    ? 'Mật khẩu không đúng.'
                    : 'Xác thực thất bại. Vui lòng thử lại.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-5 text-white flex items-center gap-2" style={{ background: 'linear-gradient(195deg, #49A3F1, #1A73E8)' }}>
                    <Lock size={18} /> <h3 className="font-bold text-lg">Xác nhận mật khẩu</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">Nhập lại mật khẩu đăng nhập để {actionLabel}.</p>
                    {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    <input
                        type="password"
                        autoFocus
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="argon-input w-full"
                        placeholder="Mật khẩu"
                    />
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 argon-button-gradient flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Xác nhận
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
    const [folders, setFolders] = useState<SecureFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    const [showCreate, setShowCreate] = useState(false);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [renamingFolder, setRenamingFolder] = useState<SecureFolder | null>(null);
    const [deletingFolder, setDeletingFolder] = useState<SecureFolder | null>(null);
    const [folderActionLoading, setFolderActionLoading] = useState(false);

    const [viewing, setViewing] = useState<SecureContent | null>(null);
    const [deleting, setDeleting] = useState<SecureContent | null>(null);
    const [movingItem, setMovingItem] = useState<SecureContent | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rowError, setRowError] = useState('');
    const [pendingAction, setPendingAction] = useState<{ type: 'view' | 'download'; item: SecureContent } | null>(null);

    useEffect(() => {
        const unsubItems = subscribeToSecureContents((list) => {
            setItems(list);
            setLoading(false);
        });
        const unsubFolders = subscribeToSecureFolders(setFolders);
        return () => { unsubItems(); unsubFolders(); };
    }, []);

    const visibleFolders = folders.filter(f => (f.parentId ?? null) === currentFolderId);
    const visibleItems = items.filter(i => (i.folderId ?? null) === currentFolderId);
    const breadcrumb = buildBreadcrumb(folders, currentFolderId);

    const isFolderEmpty = (folderId: string) =>
        !folders.some(f => f.parentId === folderId) && !items.some(i => (i.folderId ?? null) === folderId);

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

    const handlePasswordConfirmed = () => {
        if (!pendingAction) return;
        const { type, item } = pendingAction;
        setPendingAction(null);
        if (type === 'view') setViewing(item);
        else handleDownload(item);
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

    const handleDeleteFolderClick = (folder: SecureFolder) => {
        if (!isFolderEmpty(folder.id)) {
            alert('Thư mục này chưa trống. Hãy xoá hoặc chuyển hết nội dung / thư mục con ra ngoài trước.');
            return;
        }
        setDeletingFolder(folder);
    };

    const handleConfirmDeleteFolder = async () => {
        if (!deletingFolder) return;
        setFolderActionLoading(true);
        try {
            await deleteSecureFolder(deletingFolder.id);
            setDeletingFolder(null);
        } finally {
            setFolderActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <FileLock2 size={20} className="text-[#1A73E8]" /> Nội dung mã hoá
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {items.length} mục · Lưu dạng mã hoá trên server, giải mã khi xem / tải xuống
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowCreateFolder(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-400 transition">
                        <FolderPlus size={18} /> Thư mục mới
                    </button>
                    <button onClick={() => setShowCreate(true)} className="argon-button-gradient flex items-center gap-2">
                        <Plus size={18} /> Thêm nội dung
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm flex-wrap">
                <button
                    onClick={() => setCurrentFolderId(null)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition ${
                        currentFolderId === null ? 'text-[#1A73E8] bg-blue-50' : 'text-gray-500 hover:text-[#1A73E8] hover:bg-blue-50'
                    }`}
                >
                    <Home size={14} /> Gốc
                </button>
                {breadcrumb.map(f => (
                    <React.Fragment key={f.id}>
                        <ChevronRight size={14} className="text-gray-300" />
                        <button
                            onClick={() => setCurrentFolderId(f.id)}
                            className={`px-2 py-1 rounded-lg font-semibold transition ${
                                currentFolderId === f.id ? 'text-[#1A73E8] bg-blue-50' : 'text-gray-500 hover:text-[#1A73E8] hover:bg-blue-50'
                            }`}
                        >
                            {f.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {rowError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{rowError}</p>}

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A73E8]"></div></div>
            ) : visibleFolders.length === 0 && visibleItems.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <FileLock2 size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                        {currentFolderId ? 'Thư mục này đang trống' : 'Chưa có nội dung nào'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Thêm text hoặc markdown, hệ thống sẽ mã hoá và lưu lại</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    {visibleFolders.map(folder => {
                        const childCount =
                            folders.filter(f => f.parentId === folder.id).length +
                            items.filter(i => (i.folderId ?? null) === folder.id).length;
                        return (
                            <div key={folder.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition group">
                                <button onClick={() => setCurrentFolderId(folder.id)} className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                                    <Folder size={16} />
                                </button>
                                <button onClick={() => setCurrentFolderId(folder.id)} className="min-w-0 flex-grow text-left">
                                    <p className="font-semibold text-gray-700 truncate">{folder.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{childCount} mục</p>
                                </button>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button onClick={() => setRenamingFolder(folder)} title="Đổi tên"
                                        className="p-2 text-gray-400 hover:text-[#1A73E8] hover:bg-blue-50 rounded-lg transition">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteFolderClick(folder)} title="Xoá thư mục"
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {visibleItems.map(item => (
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
                                <button onClick={() => setPendingAction({ type: 'view', item })} title="Xem"
                                    className="p-2 text-gray-400 hover:text-[#1A73E8] hover:bg-blue-50 rounded-lg transition">
                                    <Eye size={16} />
                                </button>
                                <button onClick={() => setPendingAction({ type: 'download', item })} disabled={busyId === item.id} title="Tải xuống"
                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50">
                                    {busyId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                </button>
                                <button onClick={() => setMovingItem(item)} title="Chuyển thư mục"
                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                                    <FolderInput size={16} />
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
                <CreateContentForm adminId={user.uid} folderId={currentFolderId} onClose={() => setShowCreate(false)} />
            )}

            {showCreateFolder && (
                <FolderFormModal
                    title="Tạo thư mục mới"
                    submitLabel="Tạo"
                    onSubmit={(name) => createSecureFolder(name, currentFolderId, user.uid)}
                    onClose={() => setShowCreateFolder(false)}
                />
            )}

            {renamingFolder && (
                <FolderFormModal
                    title="Đổi tên thư mục"
                    submitLabel="Lưu"
                    initialName={renamingFolder.name}
                    onSubmit={(name) => renameSecureFolder(renamingFolder.id, name)}
                    onClose={() => setRenamingFolder(null)}
                />
            )}

            {movingItem && (
                <MoveContentModal item={movingItem} folders={folders} onClose={() => setMovingItem(null)} />
            )}

            {pendingAction && (
                <PasswordConfirmModal
                    user={user}
                    actionLabel={pendingAction.type === 'view' ? 'xem nội dung' : 'tải nội dung xuống'}
                    onSuccess={handlePasswordConfirmed}
                    onCancel={() => setPendingAction(null)}
                />
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

            {deletingFolder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <h3 className="font-bold text-gray-700 text-lg">Xoá thư mục?</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Thư mục "{deletingFolder.name}" đang trống và sẽ bị xoá. Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingFolder(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                                Hủy
                            </button>
                            <button onClick={handleConfirmDeleteFolder} disabled={folderActionLoading} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2">
                                {folderActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
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
