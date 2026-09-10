import {
    query, orderBy, onSnapshot, getDoc, setDoc, deleteDoc,
    serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
    getSecureContentsCollectionRef,
    getSecureContentDocRef,
    getSecureConfigDocRef,
} from './config';

// =================================================================
// TYPES
// =================================================================

export type SecureContentFormat = 'text' | 'markdown';

export interface SecureContent {
    id: string;
    title: string;
    format: SecureContentFormat;
    cipher: string;   // base64 của (IV[12] || ciphertext AES-GCM)
    size: number;     // độ dài nội dung gốc (bytes UTF-8)
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
            createdAt: (d.data().createdAt as Timestamp)?.toMillis() || Date.now(),
        } as SecureContent)));
    }, (error) => {
        console.warn('subscribeToSecureContents: không đọc được, trả về danh sách rỗng.', error.code);
        callback([]);
    });
};

/** Mã hoá nội dung bằng key trong Firestore rồi lưu document nội dung. */
export async function addSecureContent(
    title: string,
    format: SecureContentFormat,
    plaintext: string,
    adminId: string,
): Promise<void> {
    const id = uuidv4();
    const cipher = await encryptToBase64(plaintext);

    // Firestore giới hạn ~1 MiB / document
    if (cipher.length > 900_000) {
        throw new Error('Nội dung quá lớn (giới hạn ~700KB text). Hãy chia nhỏ.');
    }

    await setDoc(getSecureContentDocRef(id), {
        title: title.trim(),
        format,
        cipher,
        size: new TextEncoder().encode(plaintext).length,
        adminId,
        createdAt: serverTimestamp(),
    });
}

export async function deleteSecureContent(item: SecureContent): Promise<void> {
    await deleteDoc(getSecureContentDocRef(item.id));
}

/** Giải mã nội dung của một mục, trả về chuỗi gốc. */
export async function decryptSecureContent(item: SecureContent): Promise<string> {
    if (!item.cipher) {
        throw new Error('Mục này không có dữ liệu mã hoá (có thể là dữ liệu cũ) — hãy xoá và tạo lại.');
    }
    return decryptFromBase64(item.cipher);
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
