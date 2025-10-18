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
    addDoc,
    Timestamp, 
    serverTimestamp, 
    writeBatch,
    increment,
    orderBy,                 
    QueryDocumentSnapshot,   
    type DocumentData
} from 'firebase/firestore';;

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
    duration: number; // Tính bằng giây
    order: number;
    adminId: string;
    // FIX LỖI: Cần thêm createdAt (là number - milliseconds)
    createdAt: number; 
}

export interface Course {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    adminId: string;
    videoCount: number;
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

/** Trả về collection reference cho Sub-Collection videos của một Khóa học */
export const getVideosCollectionRef = (courseId: string) => {
    // Đường dẫn: /artifacts/{APP_ID_ROOT}/public/data/courses/{courseId}/videos
    const coursesRef = getCoursesCollectionRef();
    return collection(coursesRef, courseId, 'videos');
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(), // <-- THÊM
        videoCount: 0,
    });
}

// =================================================================
// 8. VIDEO MANAGEMENT FUNCTIONS
// =================================================================
/** Admin thêm một video mới vào Sub-Collection của một Khóa học. */
export async function addVideo(courseId: string, videoData: Omit<Video, 'id'>, adminId: string): Promise<void> {
    const db = getFirestoreDb();
    const batch = writeBatch(db); // Khởi tạo Batch Write

    // 1. Lấy References
    const videoRef = doc(getVideosCollectionRef(courseId)); // Doc Ref mới trong Sub-collection
    const courseRef = doc(getCoursesCollectionRef(), courseId); // Doc Ref Khóa học cha

    // 2. Chuẩn bị dữ liệu Video
    const videoPayload = {
        ...videoData,
        adminId,
        createdAt: serverTimestamp(),
        // Không cần updatedAt cho Video (có thể thêm nếu cần)
    };

    // 3. Thực hiện Batched Write
    // a) Thêm Document Video mới
    batch.set(videoRef, videoPayload);

    // b) Cập nhật Course cha (Tăng số lượng và thời gian cập nhật)
    batch.update(courseRef, {
        videoCount: increment(1), // Tăng videoCount lên 1
        updatedAt: serverTimestamp(),
    });

    // 4. Commit (Đảm bảo cả hai thao tác thành công hoặc thất bại cùng lúc)
    await batch.commit();
    console.log(`Video "${videoData.title}" đã được thêm vào khóa học ${courseId} thành công.`);
}

/**
 * Lắng nghe real-time danh sách Video của một Khóa học.
 * @param courseId ID của Khóa học cha.
 * @param callback Hàm callback được gọi mỗi khi dữ liệu video thay đổi.
 * @returns Hàm unsubscribe để dừng lắng nghe.
 */
export const subscribeToVideos = (courseId: string, callback: (videos: Video[]) => void): () => void => {
    const videosRef = getVideosCollectionRef(courseId);
    
    // FIX LỖI INDEX: Bỏ orderBy() để tránh yêu cầu Composite Index.
    const q = query(videosRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let videos: Video[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data();
            
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;

            return {
                id: doc.id,
                title: data.title as string,
                url: data.url as string,
                duration: data.duration as number,
                order: data.order as number,
                adminId: data.adminId as string,
                // Chuyển đổi Timestamp sang milliseconds để tiện sắp xếp
                createdAt: createdAtTimestamp?.toMillis() || Date.now(), 
            } as Video;
        });

        // FIX SẮP XẾP: Thực hiện sắp xếp client-side (trên trình duyệt)
        videos.sort((a, b) => {
            // Sắp xếp chính: Theo thứ tự (order) tăng dần
            if (a.order !== b.order) {
                return a.order - b.order; 
            }
            // Sắp xếp phụ (khi order bằng nhau): Theo thời gian tạo (cũ hơn lên trước)
            return (a.createdAt || 0) - (b.createdAt || 0); 
        });

        callback(videos);
    }, (error) => {
        console.error(`Lỗi lắng nghe Video cho Course ID ${courseId}:`, error);
    });

    return unsubscribe;
};