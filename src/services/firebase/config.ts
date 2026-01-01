import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, Firestore, collection, doc } from 'firebase/firestore';
import { getStorage } from "firebase/storage";

// Cấu hình Firebase
// UPDATE: Thêm export để file auth.ts có thể sử dụng lại config này
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "API_KEY_NOT_SET",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const APP_ID_ROOT = "video-hub-prod-id";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: any = null;

// Định nghĩa cấu trúc đa ngôn ngữ
export interface LocalizedText {
    vi: string; // Tiếng Việt là bắt buộc (Gốc)
    ja?: string; // Tiếng Nhật (Optional)
    en?: string; // Tiếng Anh (Optional - Giữ lại để sau này enable nếu cần)
}

// Union Type: Chấp nhận cả string cũ và object mới
export type MultilingualField = string | LocalizedText;

try {
    if (!app) {
        try { app = getApp(); } catch (e) { app = initializeApp(firebaseConfig); }
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
        console.log("Firebase services initialized successfully.");
    }
} catch (error) {
    console.error("Lỗi khi khởi tạo Firebase:", error);
}

export const getFirestoreDb = (): Firestore => {
    if (!db) throw new Error("Firestore DB chưa được khởi tạo.");
    return db;
};

export const getFirebaseAuth = (): Auth => {
    if (!auth) throw new Error("Firebase Auth chưa được khởi tạo.");
    return auth;
};

export const getFirebaseStorage = () => {
    if (!storage) throw new Error("Firebase Storage chưa được khởi tạo.");
    return storage;
};

/**
 * Đường dẫn gốc cho dữ liệu công khai (Public Data)
 */
export const getBasePublicPath = () => `artifacts/${APP_ID_ROOT}/public/data`;

/**
 * Đường dẫn gốc cho dữ liệu riêng tư của từng User theo Rule 1
 * ✅ Đảm bảo hàm này được export chính xác
 */
export const getBaseUserPath = (userId: string) => `artifacts/${APP_ID_ROOT}/users/${userId}`;

export const getCurrentAppId = (): string => APP_ID_ROOT;

// --- SHARED PATH GETTERS ---
export const getCoursesCollectionRef = () => collection(getFirestoreDb(), `artifacts/${APP_ID_ROOT}/public/data/courses`);
export const getCourseDocRef = (courseId: string) => doc(getFirestoreDb(), `artifacts/${APP_ID_ROOT}/public/data/courses`, courseId);
export const getSessionsCollectionRef = (courseId: string) => collection(getCoursesCollectionRef(), courseId, 'sessions');
export const getVideosCollectionRef = (courseId: string) => collection(getCoursesCollectionRef(), courseId, 'videos');
export const getEnrollmentsCollectionRef = () => collection(getFirestoreDb(), `artifacts/${APP_ID_ROOT}/public/data/enrollments`);