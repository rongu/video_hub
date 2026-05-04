import React, { useState, useEffect } from 'react';
import {
    Tag, Plus, Edit2, Trash2, X, Check, Loader2, BookOpen
} from 'lucide-react';
import {
    subscribeToCategories, addCategory, updateCategory, deleteCategory,
    CATEGORY_COLORS, getCategoryColorConfig,
    type Category
} from '../../services/firebase/categories';
import { subscribeToCourses, type Course } from '../../services/firebase/courses';
import { tr_h } from '../../services/firebase/i18nHelper';

const EMOJI_PRESETS = ['📚', '🎓', '💻', '🌐', '🗾', '🇬🇧', '🧮', '🔬', '🎨', '🎵', '⚙️', '📊', '✏️', '🏆', '🌟'];

// --- Badge component (shared) ---
export const CategoryBadge: React.FC<{ category: Category; size?: 'sm' | 'md' }> = ({ category, size = 'sm' }) => {
    const cfg = getCategoryColorConfig(category.color);
    return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}>
            <span>{category.emoji}</span>
            <span>{tr_h(category.name)}</span>
        </span>
    );
};

// --- Edit / Create Form Modal ---
interface CategoryFormProps {
    initial: Category | null;
    onSave: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
    onClose: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ initial, onSave, onClose }) => {
    const [nameVi, setNameVi] = useState(initial ? (typeof initial.name === 'string' ? initial.name : initial.name.vi) : '');
    const [nameJa, setNameJa] = useState(initial ? (typeof initial.name === 'string' ? '' : initial.name.ja || '') : '');
    const [color, setColor] = useState(initial?.color || 'blue');
    const [emoji, setEmoji] = useState(initial?.emoji || '📚');
    const [customEmoji, setCustomEmoji] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameVi.trim()) { setError('Tên danh mục (tiếng Việt) là bắt buộc.'); return; }
        setLoading(true);
        try {
            await onSave({
                name: { vi: nameVi.trim(), ja: nameJa.trim() || nameVi.trim() },
                color,
                emoji: customEmoji.trim() || emoji,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-5 text-white flex items-center justify-between" style={{ background: 'linear-gradient(195deg, #49A3F1, #1A73E8)' }}>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Tag size={20} />
                        {initial ? 'Sửa danh mục' : 'Tạo danh mục mới'}
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full transition"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                    {/* Emoji */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Icon (Emoji)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {EMOJI_PRESETS.map(e => (
                                <button type="button" key={e} onClick={() => { setEmoji(e); setCustomEmoji(''); }}
                                    className={`text-xl p-1.5 rounded-lg border-2 transition hover:scale-110 ${emoji === e && !customEmoji ? 'border-[#1A73E8] bg-blue-50' : 'border-transparent hover:border-gray-200'}`}>
                                    {e}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="Hoặc nhập emoji tùy chỉnh..."
                            value={customEmoji}
                            onChange={e => setCustomEmoji(e.target.value)}
                            maxLength={4}
                            className="argon-input text-sm w-full"
                        />
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Màu sắc</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORY_COLORS.map(c => (
                                <button type="button" key={c.value} onClick={() => setColor(c.value)}
                                    className={`w-8 h-8 rounded-full ${c.dot} border-4 transition hover:scale-110 ${color === c.value ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                                    title={c.value}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Xem trước:</span>
                        <CategoryBadge size="md" category={{ id: '', name: { vi: nameVi || 'Danh mục', ja: '' }, color, emoji: customEmoji || emoji, createdAt: 0 }} />
                    </div>

                    {/* Name VI */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">🇻🇳 Tên (tiếng Việt) <span className="text-red-500">*</span></label>
                        <input type="text" value={nameVi} onChange={e => setNameVi(e.target.value)} className="argon-input w-full" placeholder="Ví dụ: Tiếng Nhật JLPT" />
                    </div>

                    {/* Name JA */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">🇯🇵 Tên (tiếng Nhật) <span className="text-gray-400 font-normal">(tùy chọn)</span></label>
                        <input type="text" value={nameJa} onChange={e => setNameJa(e.target.value)} className="argon-input w-full" placeholder="例: 日本語能力試験" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 argon-button-gradient flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {initial ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main component ---
const CategoryManagerPage: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [formState, setFormState] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null });
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        const unsubCats = subscribeToCategories(setCategories);
        const unsubCourses = subscribeToCourses(setCourses);
        return () => { unsubCats(); unsubCourses(); };
    }, []);

    // Count courses per category
    const courseCountMap = categories.reduce((acc, cat) => {
        acc[cat.id] = courses.filter(c => c.categoryIds?.includes(cat.id)).length;
        return acc;
    }, {} as Record<string, number>);

    const handleSave = async (data: Omit<Category, 'id' | 'createdAt'>) => {
        if (formState.editing) {
            await updateCategory(formState.editing.id, data);
        } else {
            await addCategory(data);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setDeleteLoading(true);
        try {
            await deleteCategory(deletingId);
            setDeletingId(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    const deletingCategory = categories.find(c => c.id === deletingId);
    const coursesInDeleting = deletingId ? (courseCountMap[deletingId] || 0) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <Tag size={20} className="text-[#1A73E8]" /> Quản lý Danh mục
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{categories.length} danh mục · Dùng để phân loại khóa học</p>
                </div>
                <button onClick={() => setFormState({ open: true, editing: null })} className="argon-button-gradient flex items-center gap-2">
                    <Plus size={18} /> Tạo danh mục
                </button>
            </div>

            {/* Category grid */}
            {categories.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <Tag size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Chưa có danh mục nào</p>
                    <p className="text-gray-400 text-sm mt-1">Tạo danh mục để phân loại khóa học của bạn</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(cat => {
                        const cfg = getCategoryColorConfig(cat.color);
                        const count = courseCountMap[cat.id] || 0;
                        return (
                            <div key={cat.id} className={`bg-white rounded-xl border ${cfg.border} shadow-sm overflow-hidden`}>
                                <div className={`h-1.5 ${cfg.dot}`} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl">{cat.emoji}</span>
                                            <div>
                                                <p className="font-bold text-gray-700">{tr_h(cat.name)}</p>
                                                {typeof cat.name !== 'string' && cat.name.ja && (
                                                    <p className="text-xs text-gray-400">{cat.name.ja}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => setFormState({ open: true, editing: cat })}
                                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                title="Sửa"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => setDeletingId(cat.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Xóa"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.text} ${cfg.bg} rounded-full px-3 py-1 w-fit`}>
                                        <BookOpen size={12} />
                                        {count} khóa học
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Courses per category detail */}
            {categories.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-700 text-sm">Khóa học theo danh mục</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {categories.map(cat => {
                            const catCourses = courses.filter(c => c.categoryIds?.includes(cat.id));
                            if (catCourses.length === 0) return null;
                            return (
                                <div key={cat.id} className="px-6 py-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CategoryBadge category={cat} size="md" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {catCourses.map(c => (
                                            <span key={c.id} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                                                {tr_h(c.title)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Form modal */}
            {formState.open && (
                <CategoryForm
                    initial={formState.editing}
                    onSave={handleSave}
                    onClose={() => setFormState({ open: false, editing: null })}
                />
            )}

            {/* Delete confirm */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <h3 className="font-bold text-gray-700 text-lg">Xóa danh mục?</h3>
                            {deletingCategory && (
                                <div className="mt-2 flex justify-center"><CategoryBadge category={deletingCategory} size="md" /></div>
                            )}
                            {coursesInDeleting > 0 && (
                                <p className="text-sm text-amber-600 mt-2 bg-amber-50 rounded-lg px-3 py-2">
                                    ⚠️ {coursesInDeleting} khóa học đang dùng danh mục này. Khóa học sẽ không bị xóa, chỉ bỏ gán danh mục.
                                </p>
                            )}
                            <p className="text-sm text-gray-500 mt-2">Hành động này không thể hoàn tác.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                                Hủy
                            </button>
                            <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2">
                                {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagerPage;
