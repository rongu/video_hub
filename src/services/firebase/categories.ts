import {
    query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
    serverTimestamp, type Timestamp
} from 'firebase/firestore';
import { getCategoriesCollectionRef, getCategoryDocRef, type MultilingualField } from './config';

export interface Category {
    id: string;
    name: MultilingualField;
    color: string; // 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink' | 'orange'
    emoji: string;
    description?: MultilingualField;
    createdAt: number;
}

// Preset color palette for categories
export const CATEGORY_COLORS = [
    { value: 'blue',   bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' },
    { value: 'green',  bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
    { value: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-200' },
    { value: 'red',    bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    border: 'border-red-200' },
    { value: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' },
    { value: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-200' },
    { value: 'pink',   bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500',   border: 'border-pink-200' },
    { value: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-200' },
] as const;

export type CategoryColor = typeof CATEGORY_COLORS[number]['value'];

export const getCategoryColorConfig = (color: string) =>
    CATEGORY_COLORS.find(c => c.value === color) ?? CATEGORY_COLORS[0];

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
    const q = query(getCategoriesCollectionRef(), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
            createdAt: (d.data().createdAt as Timestamp)?.toMillis() || Date.now(),
        } as Category)));
    });
};

export async function addCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<void> {
    await addDoc(getCategoriesCollectionRef(), {
        ...data,
        createdAt: serverTimestamp(),
    });
}

export async function updateCategory(
    categoryId: string,
    data: Partial<Omit<Category, 'id' | 'createdAt'>>
): Promise<void> {
    await updateDoc(getCategoryDocRef(categoryId), data);
}

export async function deleteCategory(categoryId: string): Promise<void> {
    await deleteDoc(getCategoryDocRef(categoryId));
}
