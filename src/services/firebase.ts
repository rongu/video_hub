import { initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    type Auth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile,
    type User
} from 'firebase/auth';
import { 
    getFirestore, 
    Firestore, 
    doc, 
    setDoc, 
    collection, 
    query, 
    onSnapshot, 
    addDoc 
} from 'firebase/firestore';

// =================================================================
// 1. CẤU HÌNH CỐ ĐỊNH (LOCAL PC CONFIG)
// =================================================================

/** * 🛑🛑 BẠN PHẢI THAY THẾ CÁC GIÁ TRỊ NÀY BẰNG CẤU HÌNH FIREBASE CỦA BẠN!
 * CỐ ĐỊNH ID ỨNG DỤNG ĐỂ SỬ DỤNG TRONG FIREBASE CONSOLE: "video-hub-prod-id"
 */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "API_KEY_NOT_SET",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// ĐỊNH NGHĨA ID ỨNG DỤNG MÀ BẠN SẼ DÙNG TRONG FIREBASE FIRESTORE PATHS
const APP_ID_ROOT = "video-hub-prod-id"; 

// =================================================================
// 2. GLOBAL & TYPES
// =================================================================

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export interface Video {
    id: string;
    title: string;
    url: string; 
    duration: number; 
    order: number;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    adminId: string;
    videoCount: number;
    videos?: Video[]; 
}

// =================================================================
// 3. INITIALIZATION
// =================================================================

/**
 * Khởi tạo Firebase App, Firestore và Auth.
 * Khi chạy Local, chỉ khởi tạo dịch vụ, không tự động đăng nhập.
 */
export async function initializeAndAuthenticate(): Promise<void> {
    try {
        if (!app) {
            try {
                // Thử lấy app đã có (trường hợp hot-reload)
                app = getApp();
            } catch (e) {
                // Nếu chưa có, khởi tạo App mới
                app = initializeApp(firebaseConfig);
            }
        }

        db = getFirestore(app);
        auth = getAuth(app); 
        
        console.log("Firebase services initialized successfully.");
        
    } catch (error) {
        console.error("Lỗi khi khởi tạo Firebase:", error);
        if (!auth) {
            console.warn("Auth service failed to initialize properly.");
        }
    }
}

// =================================================================
// 4. GETTERS
// =================================================================

export const getFirestoreDb = (): Firestore => {
    if (!db) {
        throw new Error("Firestore DB chưa được khởi tạo.");
    }
    return db;
};

export const getFirebaseAuth = (): Auth => {
    if (!auth) {
        throw new Error("Firebase Auth chưa được khởi tạo. Hãy đảm bảo gọi initializeAndAuthenticate trước.");
    }
    return auth;
};

export const getCurrentAppId = (): string => APP_ID_ROOT;

// =================================================================
// 5. PATHS (Đường dẫn Firestore)
// =================================================================

/** Trả về document reference cho profile người dùng hiện tại */
export const getUserDocumentPath = (uid: string) => {
    // Đường dẫn: /artifacts/{APP_ID_ROOT}/users/{userId}/profile/user_data
    const firestore = getFirestoreDb();
    return doc(firestore, `artifacts/${APP_ID_ROOT}/users/${uid}/profile/user_data`);
};

/** Trả về collection reference cho các khóa học công khai */
export const getCoursesCollectionRef = () => {
    // Đường dẫn: /artifacts/{APP_ID_ROOT}/public/data/courses
    const firestore = getFirestoreDb();
    return collection(firestore, `artifacts/${APP_ID_ROOT}/public/data/courses`);
};

// =================================================================
// 6. AUTH HANDLERS (ID 1.2, 1.3)
// =================================================================

/** Đăng ký người dùng mới và tạo document role mặc định là 'user' */
export async function handleRegister(email: string, password: string, displayName: string): Promise<User> {
    const auth = getFirebaseAuth();
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName });
    
    // Ghi role mặc định "user" vào Firestore
    const userDocRef = getUserDocumentPath(user.uid);
    await setDoc(userDocRef, {
        role: 'user',
        displayName: displayName,
        email: email,
        createdAt: new Date(),
    });

    console.log("Đăng ký thành công và đã gán role 'user'.");
    return user;
}

/** Đăng nhập bằng Email và Mật khẩu */
export async function handleLogin(email: string, password: string): Promise<User> {
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

/** Đăng xuất người dùng */
export async function handleSignOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await signOut(auth);
    console.log("Người dùng đã đăng xuất.");
}

// =================================================================
// 7. COURSE MANAGEMENT (ID 2.1 - Vẫn giữ lại để tránh lỗi type)
// =================================================================

/** Lắng nghe tất cả các khóa học trong real-time. */
export const subscribeToCourses = (callback: (courses: Course[]) => void) => {
    const coursesRef = getCoursesCollectionRef();
    const q = query(coursesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const courses: Course[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt?.toDate() || new Date()) as Date,
        })) as Course[];

        callback(courses);
    });

    return unsubscribe;
};

/** Admin tạo một khóa học mới. */
export async function addCourse(title: string, description: string, adminId: string): Promise<void> {
    const coursesRef = getCoursesCollectionRef();
    await addDoc(coursesRef, {
        title,
        description,
        adminId,
        createdAt: new Date(),
        videoCount: 0, 
    });
}