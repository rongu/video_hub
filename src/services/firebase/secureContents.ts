import {
    query, orderBy, onSnapshot, getDoc, setDoc, updateDoc, deleteDoc, writeBatch,
    serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
    getFirestoreDb,
    getSecureContentsCollectionRef,
    getSecureContentDocRef,
    getSecureConfigDocRef,
    getSecureFoldersCollectionRef,
    getSecureFolderDocRef,
    getSecureContentChunkDocRef,
} from './config';

// =================================================================
// TYPES
// =================================================================

export type SecureContentFormat = 'text' | 'markdown';

export interface SecureContent {
    id: string;
    title: string;
    format: SecureContentFormat;
    cipher?: string;       // (dữ liệu cũ) toàn bộ ciphertext nằm ngay trong doc này
    chunkCount?: number;   // (dữ liệu mới) ciphertext được chia thành N doc con trong subcollection "chunks"
    size: number;          // độ dài nội dung gốc (bytes UTF-8)
    adminId: string;
    createdAt: number;
    folderId: string | null; // null = nằm ở thư mục gốc
}

export interface SecureFolder {
    id: string;
    name: string;
    parentId: string | null; // null = thư mục gốc, có id khác = folder con
    adminId: string;
    createdAt: number;
}

interface KeyDoc {
    alg: 'AES-GCM';
    key: string;        // base64 raw key (256-bit)
    createdAt: unknown;
}

// =================================================================
// CRYPTO HELPERS (Web Crypto API — AES-GCM 256)
// =================================================================

const IV_BYTES = 12;

const bytesToBase64 = (bytes: Uint8Array): string => {
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
};

const base64ToBytes = (b64: string): Uint8Array => {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
};

let cachedKey: CryptoKey | null = null;

/**
 * Lấy CryptoKey dùng chung. Key được lưu trong 1 document Firestore
 * (chỉ admin đọc/ghi được — xem firestore.rules). Lần đầu chưa có thì
 * tự sinh key AES-256 ngẫu nhiên và ghi vào Firestore.
 */
export async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;

    const keyRef = getSecureConfigDocRef();
    const snap = await getDoc(keyRef);

    if (snap.exists()) {
        const data = snap.data() as KeyDoc;
        const raw = base64ToBytes(data.key);
        cachedKey = await crypto.subtle.importKey(
            'raw', raw as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
        );
        return cachedKey;
    }

    // Chưa có key -> sinh mới và lưu
    const newKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
    );
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', newKey));
    await setDoc(keyRef, {
        alg: 'AES-GCM',
        key: bytesToBase64(raw),
        createdAt: serverTimestamp(),
    });

    cachedKey = await crypto.subtle.importKey(
        'raw', raw as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
    );
    return cachedKey;
}

// Giới hạn nội dung gốc trước khi mã hoá. Ciphertext (base64) lớn hơn ~1.37 lần
// bản gốc và được chia thành nhiều chunk ≤ CHUNK_SIZE ký tự (mỗi chunk là 1 doc,
// an toàn dưới giới hạn cứng 1 MiB/document của Firestore).
const MAX_CONTENT_BYTES = 5 * 1024 * 1024; // 5MB
const CHUNK_SIZE = 700_000;

const splitIntoChunks = (text: string, size: number): string[] => {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
    return chunks.length > 0 ? chunks : [''];
};

/** Mã hoá plaintext -> base64 của (IV || ciphertext). */
async function encryptToBase64(plaintext: string): Promise<string> {
    const key = await getOrCreateEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const data = new TextEncoder().encode(plaintext);
    const ct = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data),
    );
    const out = new Uint8Array(iv.length + ct.length);
    out.set(iv, 0);
    out.set(ct, iv.length);
    return bytesToBase64(out);
}

/** Giải mã base64 của (IV || ciphertext) -> plaintext. */
async function decryptFromBase64(b64: string): Promise<string> {
    const key = await getOrCreateEncryptionKey();
    const bytes = base64ToBytes(b64);
    const iv = bytes.slice(0, IV_BYTES);
    const ct = bytes.slice(IV_BYTES);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(plain);
}

// =================================================================
// CRUD
// =================================================================

export const subscribeToSecureContents = (
    callback: (items: SecureContent[]) => void,
): (() => void) => {
    const q = query(getSecureContentsCollectionRef(), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<SecureContent, 'id' | 'createdAt'>),
            folderId: (d.data().folderId as string | null | undefined) ?? null, // dữ liệu cũ chưa có field này
            createdAt: (d.data().createdAt as Timestamp)?.toMillis() || Date.now(),
        } as SecureContent)));
    }, (error) => {
        console.warn('subscribeToSecureContents: không đọc được, trả về danh sách rỗng.', error.code);
        callback([]);
    });
};

/** Mã hoá nội dung bằng key trong Firestore rồi lưu document nội dung (chia chunk nếu lớn). */
export async function addSecureContent(
    title: string,
    format: SecureContentFormat,
    plaintext: string,
    adminId: string,
    folderId: string | null = null,
): Promise<void> {
    const plaintextBytes = new TextEncoder().encode(plaintext).length;
    if (plaintextBytes > MAX_CONTENT_BYTES) {
        throw new Error(`Nội dung quá lớn (tối đa ${MAX_CONTENT_BYTES / (1024 * 1024)}MB). Hãy chia nhỏ.`);
    }

    const id = uuidv4();
    const cipher = await encryptToBase64(plaintext);
    const chunks = splitIntoChunks(cipher, CHUNK_SIZE);

    const batch = writeBatch(getFirestoreDb());
    batch.set(getSecureContentDocRef(id), {
        title: title.trim(),
        format,
        chunkCount: chunks.length,
        size: plaintextBytes,
        adminId,
        folderId,
        createdAt: serverTimestamp(),
    });
    chunks.forEach((chunk, index) => {
        batch.set(getSecureContentChunkDocRef(id, index), { data: chunk });
    });
    await batch.commit();
}

export async function deleteSecureContent(item: SecureContent): Promise<void> {
    const batch = writeBatch(getFirestoreDb());
    for (let i = 0; i < (item.chunkCount ?? 0); i++) {
        batch.delete(getSecureContentChunkDocRef(item.id, i));
    }
    batch.delete(getSecureContentDocRef(item.id));
    await batch.commit();
}

/** Chuyển 1 nội dung sang thư mục khác (hoặc về gốc nếu folderId = null). */
export async function moveSecureContent(contentId: string, folderId: string | null): Promise<void> {
    await updateDoc(getSecureContentDocRef(contentId), { folderId });
}

// =================================================================
// FOLDERS
// =================================================================

export const subscribeToSecureFolders = (
    callback: (folders: SecureFolder[]) => void,
): (() => void) => {
    const q = query(getSecureFoldersCollectionRef(), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<SecureFolder, 'id' | 'createdAt'>),
            parentId: (d.data().parentId as string | null | undefined) ?? null,
            createdAt: (d.data().createdAt as Timestamp)?.toMillis() || Date.now(),
        } as SecureFolder)));
    }, (error) => {
        console.warn('subscribeToSecureFolders: không đọc được, trả về danh sách rỗng.', error.code);
        callback([]);
    });
};

export async function createSecureFolder(
    name: string,
    parentId: string | null,
    adminId: string,
): Promise<void> {
    const id = uuidv4();
    await setDoc(getSecureFolderDocRef(id), {
        name: name.trim(),
        parentId,
        adminId,
        createdAt: serverTimestamp(),
    });
}

export async function renameSecureFolder(folderId: string, name: string): Promise<void> {
    await updateDoc(getSecureFolderDocRef(folderId), { name: name.trim() });
}

/** Chỉ xoá được thư mục rỗng (không còn folder con lẫn nội dung bên trong). */
export async function deleteSecureFolder(folderId: string): Promise<void> {
    await deleteDoc(getSecureFolderDocRef(folderId));
}

/** Giải mã nội dung của một mục, trả về chuỗi gốc. Tự ghép lại nếu ciphertext bị chia chunk. */
export async function decryptSecureContent(item: SecureContent): Promise<string> {
    let cipher: string;

    if (item.chunkCount && item.chunkCount > 0) {
        const chunkSnaps = await Promise.all(
            Array.from({ length: item.chunkCount }, (_, i) => getDoc(getSecureContentChunkDocRef(item.id, i))),
        );
        cipher = chunkSnaps.map(snap => (snap.data()?.data as string | undefined) ?? '').join('');
    } else if (item.cipher) {
        cipher = item.cipher; // dữ liệu cũ, chưa chia chunk
    } else {
        throw new Error('Mục này không có dữ liệu mã hoá (có thể là dữ liệu cũ) — hãy xoá và tạo lại.');
    }

    return decryptFromBase64(cipher);
}

// =================================================================
// DOWNLOAD HELPER
// =================================================================

/** Kích hoạt tải một chuỗi text về máy dưới dạng file. */
export function triggerTextDownload(filename: string, text: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Tên file gợi ý khi tải nội dung về (theo tiêu đề + format). */
export function suggestedFilename(item: SecureContent): string {
    const safe = item.title.trim().replace(/[^\p{L}\p{N}\-_ ]/gu, '').replace(/\s+/g, '-') || 'noi-dung';
    return `${safe}.${item.format === 'markdown' ? 'md' : 'txt'}`;
}
