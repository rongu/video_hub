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
    DocumentSnapshot, 
    type DocumentData, 
    FirestoreError,
    deleteDoc,
    where, 
    limit, 
    getDocs, 
    updateDoc, 
    getDoc, 
    type Query, 
} from 'firebase/firestore';

// BỔ SUNG CÁC FIREBASE STORAGE IMPORTS CHO QUẢN LÝ VIDEO
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject,
    uploadBytesResumable, 
} from "firebase/storage";
import { v4 as uuidv4 } from 'uuid'; 

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
export let storage: ReturnType<typeof getStorage> | null = null; 

// ✅ MỚI: Interface cho Hồ sơ User trong Firestore (dùng cho Admin quản lý)
export interface AppUser {
    uid: string; 
    displayName: string;
    email: string;
    role: 'admin' | 'student'; 
    createdAt: number;
}


export interface Video {
    id: string;
    courseId: string;
    sessionId: string; 
    title: string;
    videoUrl: string; 
    storagePath: string; 
    adminId: string;
    createdAt: number; // milliseconds
    order?: number; 
}

/**
 * Interface cho Session/Chương học
 */
export interface Session {
    id: string;
    courseId: string;
    title: string;
    orderIndex: number; // Dùng để sắp xếp
    videoCount: number; // Số lượng video trong session này
    // 🟢 THÊM: parentId. null nếu là Session cấp 1 (root session)
    parentId: string | null; 
    createdAt: number;
    updatedAt: number;
}

/**
 * Interface Course
 */
export interface Course {
    id: string;
    title: string;
    description: string;
    createdAt: number; // FIX: Chỉ dùng number (milliseconds)
    updatedAt: number; // FIX: Chỉ dùng number (milliseconds)
    adminId: string; 
    videoCount: number;
    imageUrl?: string; 
    sessions?: Session[]; // Dùng cho client side UI
}

// Cấu trúc của Bản ghi Ghi danh (Enrollment)
export interface Enrollment {
    userId: string;
    courseId: string;
    enrolledAt: Date | string; 
    status: 'active' | 'completed' | 'pending';
}

// =================================================================
// 3. INITIALIZATION & 4. GETTERS (Giữ nguyên)
// =================================================================

/**
 * Khởi tạo Firebase App, Firestore, Auth VÀ Storage.
 */
export async function initializeAndAuthenticate(): Promise<void> {
    try {
        if (!app) {
            try {
                app = getApp();
            } catch (e) {
                app = initializeApp(firebaseConfig);
            }
        }

        db = getFirestore(app);
        auth = getAuth(app); 
        storage = getStorage(app); 
        
        console.log("Firebase services initialized successfully.");
        
    } catch (error) {
        console.error("Lỗi khi khởi tạo Firebase:", error);
        if (!auth) {
            console.warn("Auth service failed to initialize properly.");
        }
    }
}

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

export const getFirebaseStorage = (): ReturnType<typeof getStorage> => {
    if (!storage) {
        throw new Error("Firebase Storage chưa được khởi tạo. Hãy đảm bảo gọi initializeAndAuthenticate trước.");
    }
    return storage;
};

export const getCurrentAppId = (): string => APP_ID_ROOT;

// =================================================================
// 5. PATHS (Đã chuẩn hóa)
// =================================================================

/** ✅ PATH Private Profile đã bị loại bỏ khỏi code để tránh nhầm lẫn */
/* export const getUserDocumentPath = (uid: string) => {
    const firestore = getFirestoreDb();
    return doc(firestore, `artifacts/${APP_ID_ROOT}/users/${uid}/profile/user_data`); 
}; */

/** ✅ Public User List (Nơi duy nhất lưu Role/Profile) */
export const getAppUsersCollectionRef = () => {
    const firestore = getFirestoreDb();
    // Path: /artifacts/{APP_ID_ROOT}/public/data/users
    return collection(firestore, `artifacts/${APP_ID_ROOT}/public/data/users`); 
};

/** Trả về collection reference cho các khóa học công khai */
export const getCoursesCollectionRef = () => {
    const firestore = getFirestoreDb();
    // Path: /artifacts/{APP_ID_ROOT}/public/data/courses
    return collection(firestore, `artifacts/${APP_ID_ROOT}/public/data/courses`);
};

/** Trả về document reference cho một Khóa học */
export const getCourseDocRef = (courseId: string) => {
    const firestore = getFirestoreDb();
    return doc(firestore, `artifacts/${APP_ID_ROOT}/public/data/courses`, courseId);
};


/** BỔ SUNG: Trả về collection reference cho Sub-Collection sessions của một Khóa học */
export const getSessionsCollectionRef = (courseId: string) => {
    const coursesRef = getCoursesCollectionRef();
    // Path: /courses/{courseId}/sessions
    return collection(coursesRef, courseId, 'sessions'); 
};

/** BỔ SUNG: Trả về document reference cho một Session cụ thể */
export const getSessionDocRef = (courseId: string, sessionId: string) => {
    const sessionsRef = getSessionsCollectionRef(courseId);
    return doc(sessionsRef, sessionId);
}

/** Trả về collection reference cho Sub-Collection videos của một Khóa học */
export const getVideosCollectionRef = (courseId: string) => {
    const coursesRef = getCoursesCollectionRef();
    return collection(coursesRef, courseId, 'videos');
};

/** Trả về document reference cho một Video cụ thể */
export const getVideoDocRef = (courseId: string, videoId: string) => {
    const videosRef = getVideosCollectionRef(courseId);
    return doc(videosRef, videoId);
}

/** Trả về collection reference cho các bản ghi ghi danh (Enrollments) */
export const getEnrollmentsCollectionRef = () => {
    const firestore = getFirestoreDb();
    // Path: /artifacts/{APP_ID_ROOT}/public/data/enrollments
    return collection(firestore, `artifacts/${APP_ID_ROOT}/public/data/enrollments`);
};

// =================================================================
// 6. AUTH & REGISTER HANDLERS 
// =================================================================

/** Đăng ký người dùng mới và tạo document role mặc định là 'student' */
export async function handleRegister(email: string, password: string, displayName: string): Promise<User> {
    const auth = getFirebaseAuth();
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName });
    
    // 1. Ghi hồ sơ User vào Collection public/data/users (NƠI DUY NHẤT)
    const usersRef = getAppUsersCollectionRef();
    await setDoc(doc(usersRef, user.uid), {
        uid: user.uid,
        displayName: displayName,
        email: email,
        role: 'student', 
        createdAt: serverTimestamp(),
    });
    
    console.log("Đăng ký thành công và đã gán role 'student'.");
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
// 7. USER MANAGEMENT FUNCTIONS (Đã được merge)
// =================================================================

/**
 * ✅ Admin tạo User (tài khoản Auth) và hồ sơ Firestore (role: student).
 * 🛑 FIX: Chỉ lưu vào Public Path và sau đó đăng xuất.
 * @returns {AppUser} Thông tin user đã tạo
 */
export async function adminCreateUserAndProfile(
    email: string, 
    password: string, 
    displayName: string
): Promise<AppUser> {
    const auth = getFirebaseAuth();
    const db = getFirestoreDb();

    // 1. Tạo tài khoản trong Firebase Auth (Tự động đăng nhập User mới)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName });

    const userProfile: AppUser = {
        uid: user.uid,
        displayName: displayName,
        email: email,
        role: 'student', 
        createdAt: Date.now(),
    };

    // 2. Lưu hồ sơ User vào Collection public/data/users (NƠI DUY NHẤT)
    const usersRef = getAppUsersCollectionRef();
    await setDoc(doc(usersRef, user.uid), { ...userProfile, createdAt: serverTimestamp() });
    
    // 3. BƯỚC QUAN TRỌNG: Đăng xuất User mới vừa được tạo
    await signOut(auth);
    
    return userProfile;
}

/**
 * ✅ MỚI: Lắng nghe danh sách tất cả AppUser (dùng cho Admin Page)
 */
export const subscribeToAppUsers = (callback: (users: AppUser[]) => void): () => void => {
    const usersRef = getAppUsersCollectionRef();
    const q = query(usersRef, orderBy('createdAt', 'desc')); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const users: AppUser[] = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;

            return {
                uid: doc.id,
                displayName: data.displayName as string || 'Unknown',
                email: data.email as string,
                role: data.role as 'admin' | 'student',
                createdAt: createdAtTimestamp?.toMillis() || Date.now(),
            } as AppUser;
        });

        callback(users);
    }, (error: FirestoreError) => {
        console.error("Lỗi khi lắng nghe Users:", error);
        callback([]);
    });

    return unsubscribe;
};


// =================================================================
// 8. COURSE MANAGEMENT 
// =================================================================

/** Lắng nghe tất cả các khóa học trong real-time. */
export const subscribeToCourses = (callback: (courses: Course[]) => void): (() => void) => {
    const coursesRef = getCoursesCollectionRef();
    const q = query(coursesRef, orderBy('createdAt', 'desc')); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const courses: Course[] = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;
            const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;

            return {
                id: doc.id,
                title: data.title as string,
                description: data.description as string,
                videoCount: data.videoCount as number || 0,
                adminId: data.adminId as string,
                imageUrl: data.imageUrl as string || 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course+Image', 
                sessions: [], // Gán sessions rỗng khi fetch từ doc Course chính
                // CHUYỂN ĐỔI SANG MILLISECONDS (NUMBER)
                createdAt: createdAtTimestamp?.toMillis() || Date.now(),
                updatedAt: updatedAtTimestamp?.toMillis() || Date.now(),
            } as Course;
        });

        callback(courses);
    }, (error: FirestoreError) => {
        console.error("Lỗi khi lắng nghe Khóa học (subscribeToCourses):", error);
        callback([]);
    });

    return unsubscribe;
};

export async function addCourse(
    updateData: { title?: string; description?: string ; adminId?: string}
): Promise<void> {
    const coursesRef = getCoursesCollectionRef();
    await addDoc(coursesRef, {
        ...updateData,
        imageUrl: 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course+Image', 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        videoCount: 0,
    });
}

export async function updateCourse(
    courseId: string, 
    updateData: { title?: string; description?: string }
): Promise<void> {
    const courseDocRef = getCourseDocRef(courseId);
    
    await updateDoc(courseDocRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
    });
}


export const deleteCourse = async (courseId: string): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);

    const courseDocRef = getCourseDocRef(courseId);
    const videosRef = getVideosCollectionRef(courseId);
    
    // 1. Lấy tất cả Video Docs trong Sub-collection
    const videosSnapshot = await getDocs(videosRef);
    
    const storagePaths: string[] = [];
    
    videosSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Video;
        // Thêm đường dẫn Storage vào danh sách xóa
        if (data.storagePath) {
            storagePaths.push(data.storagePath);
        }
        // Thêm document video vào batch để xóa
        batch.delete(docSnap.ref); 
    });

    // 2. Xóa tất cả file trong Storage (bước này không dùng batch)
    const deletionPromises = storagePaths.map(path => {
        try {
            const fileRef = ref(storage, path);
            return deleteObject(fileRef);
        } catch (e) {
            console.warn(`Không thể xóa file Storage tại ${path}. Có thể file không tồn tại. Tiếp tục...`, e);
            return Promise.resolve(); // Vẫn resolve để không làm crash toàn bộ quá trình
        }
    });
    
    await Promise.all(deletionPromises);
    
    // 3. Xóa document Khóa học chính
    batch.delete(courseDocRef);

    // 4. Commit batch: Xóa tất cả document (video + course)
    try {
        await batch.commit();
        
        // 5. BƯỚC XÁC MINH (Mới): Đọc lại document ngay lập tức sau khi commit
        const docCheck = await getDoc(courseDocRef);

        if (docCheck.exists()) {
            console.error(`🔴 XÓA KHÔNG THÀNH CÔNG: Document Khóa học ID ${courseId} VẪN TỒN TẠI sau khi batch.commit() thành công!`);
            console.error("Vui lòng kiểm tra lại APP_ID_ROOT/Project ID và Security Rules.");
        } else {
            console.log(`✅ Đã xóa thành công Khóa học ID: ${courseId} và ${videosSnapshot.size} video liên quan (Đã xác minh).`);
        }
    } catch (error) {
        // Cập nhật: Thêm log chi tiết nếu batch commit thất bại
        console.error(`❌ LỖI XÓA KHÓA HỌC ID: ${courseId}. KHÔNG THỂ COMMIT BATCH (Kiểm tra Security Rules):`, error);
        throw new Error("Xóa Khóa học thất bại. Vui lòng kiểm tra Firebase Security Rules hoặc kết nối.");
    }
};

/**
 * Lắng nghe real-time thông tin chi tiết của một khóa học.
 */
export const subscribeToCourseDetail = (courseId: string, callback: (course: Course | null) => void): (() => void) => {
    const courseDocRef = getCourseDocRef(courseId);

    const unsubscribe = onSnapshot(courseDocRef, (docSnap: DocumentSnapshot<DocumentData>) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;
            const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;

            const course: Course = {
                id: docSnap.id,
                title: data.title as string,
                description: data.description as string,
                videoCount: data.videoCount as number || 0,
                adminId: data.adminId as string,
                imageUrl: data.imageUrl as string || 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course+Image',
                // CHUYỂN ĐỔI SANG MILLISECONDS (NUMBER)
                createdAt: createdAtTimestamp?.toMillis() || Date.now(),
                updatedAt: updatedAtTimestamp?.toMillis() || Date.now(),
                sessions: [],
            };
            callback(course);
        } else {
            callback(null); 
        }
    }, (error: FirestoreError) => {
        console.error(`Lỗi khi lắng nghe Chi tiết Khóa học ID ${courseId}:`, error);
        callback(null);
        throw error;
    });

    return unsubscribe;
};


// =================================================================
// 9. SESSION MANAGEMENT FUNCTIONS (CẬP NHẬT: FIX INDEX)
// =================================================================

/** * Lắng nghe tất cả các Session của một Khóa học. 
 * ✅ FIX: Chỉ sắp xếp theo orderIndex để tránh lỗi index. Sắp xếp client-side nếu cần.
*/
export const subscribeToSessions = (courseId: string, callback: (sessions: Session[]) => void): (() => void) => {
    const sessionsRef = getSessionsCollectionRef(courseId);
    // 🛑 FIX LỖI INDEXING: Chỉ dùng 1 orderBy
    const q = query(sessionsRef, orderBy('orderIndex', 'asc')); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
        let sessions: Session[] = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;
            
            return {
                id: doc.id,
                courseId: courseId,
                title: data.title as string,
                orderIndex: data.orderIndex as number || 999, // Mặc định 999
                videoCount: data.videoCount as number || 0,
                parentId: data.parentId as string || null, // Cần trường này cho Session Tree
                createdAt: createdAtTimestamp?.toMillis() || Date.now(),
            } as Session;
        });

        // ✅ CLIENT-SIDE SORTING (Nếu cần sắp xếp phức tạp hơn)
        // sessions.sort((a, b) => a.orderIndex - b.orderIndex || a.createdAt - b.createdAt);
        
        callback(sessions);
    }, (error: FirestoreError) => {
        console.error("Lỗi khi lắng nghe Sessions (subscribeToSessions):", error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * ✅ EXPORT NÀY BỊ THIẾU: Admin tạo một Session mới.
 * CẬP NHẬT: Tăng sessionCount trong Course.
 */
export async function addSession(
    courseId: string, 
    title: string, 
    currentSessionCount: number,
    parentId: string | null = null,
): Promise<void> {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const sessionsRef = getSessionsCollectionRef(courseId);
    const courseDocRef = getCourseDocRef(courseId);
    
    const nextOrderIndex = currentSessionCount + 1; 

    // 1. Thêm Document Session
    batch.set(doc(sessionsRef), {
        courseId,
        title: title.trim(),
        orderIndex: nextOrderIndex,
        videoCount: 0,
        parentId: parentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // 2. Cập nhật Course
    // LƯU Ý: Trường sessionCount cần tồn tại trên Course doc
    // batch.update(courseDocRef, {
    //     sessionCount: increment(1),
    //     updatedAt: serverTimestamp(),
    // });
    
    // Tạm thời bỏ qua sessionCount update để không crash nếu field không tồn tại

    await batch.commit();
}

/**
 * ✅ EXPORT NÀY BỊ THIẾU: Admin cập nhật Session.
 */
export async function updateSession(courseId: string, sessionId: string, newTitle: string): Promise<void> {
    const sessionDocRef = getSessionDocRef(courseId, sessionId);
    await updateDoc(sessionDocRef, {
        title: newTitle.trim(),
        updatedAt: serverTimestamp(),
    });
}

/**
 * ✅ EXPORT NÀY BỊ THIẾU: Admin xóa Session và tất cả Video liên quan
 */
export const deleteSession = async (courseId: string, sessionId: string): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);
    
    // Mảng lưu các đường dẫn file cần xóa trên Storage
    const storagePathsToDelete: string[] = [];

    // 1. Lấy toàn bộ Sessions của khóa học để tìm cây con client-side (nhanh hơn query nhiều lần)
    const allSessionsSnapshot = await getDocs(getSessionsCollectionRef(courseId));
    const allVideosSnapshot = await getDocs(getVideosCollectionRef(courseId));

    const allSessions = allSessionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Session));
    const allVideos = allVideosSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 2. Hàm đệ quy để thu thập tất cả ID cần xóa
    const sessionIdsToDelete = new Set<string>();
    
    const collectIdsRecursive = (targetId: string) => {
        sessionIdsToDelete.add(targetId);
        
        // Tìm các session con
        const children = allSessions.filter(s => s.parentId === targetId);
        children.forEach(child => collectIdsRecursive(child.id));
    };

    collectIdsRecursive(sessionId);

    // 3. Thêm các Session vào Batch xóa
    sessionIdsToDelete.forEach(id => {
        const sRef = doc(getSessionsCollectionRef(courseId), id);
        batch.delete(sRef);
    });

    // 4. Thêm các Video thuộc các Session này vào Batch xóa và lấy đường dẫn Storage
    allVideos.forEach(video => {
        if (sessionIdsToDelete.has(video.sessionId)) {
            const vRef = doc(getVideosCollectionRef(courseId), video.id);
            batch.delete(vRef);
            if (video.storagePath) {
                storagePathsToDelete.push(video.storagePath);
            }
        }
    });

    // 5. Cập nhật lại videoCount của Course (giảm đi số video bị xóa)
    const videosDeletedCount = allVideos.filter(v => sessionIdsToDelete.has(v.sessionId)).length;
    const courseDocRef = doc(getCoursesCollectionRef(), courseId);
    batch.update(courseDocRef, {
        videoCount: increment(-videosDeletedCount),
        updatedAt: serverTimestamp()
    });

    // 6. Thực thi Batch (Xóa toàn bộ Firestore Docs trong 1 lần)
    await batch.commit();

    // 7. Xóa các file vật lý trên Storage (Chạy sau khi Firestore thành công)
    const storagePromises = storagePathsToDelete.map(path => {
        const fileRef = ref(storage, path);
        return deleteObject(fileRef).catch(e => console.warn("Lỗi xóa file storage (có thể file không tồn tại):", path));
    });
    
    await Promise.all(storagePromises);
    
    console.log(`✅ Đã xóa sạch Session ${sessionId}, các session con và ${videosDeletedCount} video.`);
};


// =================================================================
// 10. VIDEO MANAGEMENT FUNCTIONS (Giữ nguyên)
// =================================================================

/**
 * Tạo một UUID duy nhất cho ID video.
 */
export const generateVideoId = () => uuidv4();

/**
 * Tải file video lên Firebase Storage.
 */
export const uploadVideoFile = async (
    file: File, 
    courseId: string, 
    videoId: string
): Promise<{videoUrl: string, storagePath: string}> => {
    
    const storage = getFirebaseStorage();
    // Path: artifacts/{APP_ID_ROOT}/videos/{courseId}/{videoId}/{videoName}
    const path = `artifacts/${APP_ID_ROOT}/videos/${courseId}/${videoId}/${file.name}`; 
    const videoRef = ref(storage, path);
    
    try {
        await uploadBytes(videoRef, file);
        const downloadURL = await getDownloadURL(videoRef);
        return {
            videoUrl: downloadURL,
            storagePath: path,
        };
    } catch (e) {
        console.error("Lỗi khi tải file video lên Storage:", e);
        throw new Error("Không thể tải file video lên. (Lỗi: Thiếu quyền hoặc Lỗi kết nối)");
    }
};

/** * Admin thêm một video mới. CẬP NHẬT: Thêm tham số sessionId.
 * SỬ DỤNG BATCH ĐỂ CẬP NHẬT: Course.videoCount VÀ Session.videoCount.
 */
export async function createVideo(
    courseId: string,
    sessionId: string, // ✅ NHẬN: sessionId
    title: string,
    videoUrl: string,
    storagePath: string,
    adminId: string,
    videoId: string, 
): Promise<string> {
    
    const db = getFirestoreDb();
    const batch = writeBatch(db); 
    
    // 1. Lấy References
    const videosCollectionRef = getVideosCollectionRef(courseId);
    const newVideoDocRef = doc(videosCollectionRef, videoId); 
    const courseDocRef = getCourseDocRef(courseId);
    const sessionDocRef = getSessionDocRef(courseId, sessionId); // ✅ LẤY REF SESSION
    
    try {
        // 2. Tạo document Video 
        batch.set(newVideoDocRef, {
            courseId,
            sessionId, // ✅ GHI FIELD sessionId
            title,
            videoUrl,
            storagePath,
            adminId,
            createdAt: serverTimestamp(),
        });
        
        // 3. Cập nhật videoCount của Khóa học
        batch.update(courseDocRef, {
            videoCount: increment(1), 
            updatedAt: serverTimestamp(),
        });

        // 4. CẬP NHẬT videoCount của Session (THÊM MỚI)
        batch.update(sessionDocRef, {
            videoCount: increment(1),
            updatedAt: serverTimestamp(),
        });

        // 5. Commit
        await batch.commit();
        
        return videoId;
        
    } catch (e) {
        console.error("Lỗi khi tạo video hoặc cập nhật Khóa học/Session:", e);
        throw new Error("Không thể lưu thông tin video. Vui lòng thử lại.");
    }
}

/** * Admin cập nhật thông tin Video (hiện tại chỉ là title).
 * GIỮ NGUYÊN, không cần thay đổi.
 */
export async function updateVideo(
    courseId: string, 
    videoId: string, 
    updateData: { title: string }
): Promise<void> {
    const videoDocRef = getVideoDocRef(courseId, videoId);
    
    await updateDoc(videoDocRef, {
        title: updateData.title,
    });
}


/**
 * Xóa video khỏi Firestore và Storage. CẬP NHẬT: Giảm videoCount của Session
 * @param courseId ID Khóa học cha.
 * @param videoId ID của video.
 * @param storagePath Đường dẫn trong Firebase Storage.
 * @param sessionId ID của Session (CẦN THIẾT ĐỂ GIẢM COUNT)
 */
export const deleteVideo = async (
    courseId: string, 
    videoId: string,
    storagePath: string,
    sessionId: string, // ✅ NHẬN: sessionId
): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);

    // 1. Lấy References
    const videoDocRef = getVideoDocRef(courseId, videoId);
    const courseDocRef = getCourseDocRef(courseId);
    const sessionDocRef = getSessionDocRef(courseId, sessionId); // ✅ LẤY REF SESSION
    const videoStorageRef = ref(storage, storagePath);

    try {
        // 2. Xóa file khỏi Storage (Không cần Batch)
        await deleteObject(videoStorageRef);

        // 3. Thực hiện Batched Write
        // a) Xóa Document Video
        batch.delete(videoDocRef);

        // b) Cập nhật Course cha (Giảm số lượng)
        batch.update(courseDocRef, {
            videoCount: increment(-1), 
            updatedAt: serverTimestamp(),
        });
        
        // c) Cập nhật Session cha (Giảm số lượng)
        batch.update(sessionDocRef, {
            videoCount: increment(-1), 
            updatedAt: serverTimestamp(),
        });


        // 4. Commit
        await batch.commit();

        console.log(`Video ID ${videoId} đã được xóa thành công.`);
    } catch (e) {
        console.error("Lỗi khi xóa video hoặc cập nhật Khóa học/Session:", e);
        throw new Error("Không thể xóa video. Vui lòng kiểm tra quyền và thử lại.");
    }
};


/**
 * Lắng nghe real-time danh sách Video của một Khóa học. 
 * ✅ CẬP NHẬT: Nhận sessionId và lọc dữ liệu (Tham số thứ 2).
 */
export const subscribeToVideos = (
    courseId: string, 
    sessionId: string | null, // ✅ THÊM: Tham số Session ID
    callback: (videos: Video[]) => void
): (() => void) => {
    const videosRef = getVideosCollectionRef(courseId);
    
    let q: Query; 
    
    // Nếu có Session ID, thêm điều kiện lọc
    if (sessionId) {
        // Tối ưu hóa truy vấn: Chỉ lọc theo sessionId và sắp xếp theo createdAt
        q = query(
            videosRef, 
            where('sessionId', '==', sessionId), // ✅ LỌC THEO SESSION ID
            orderBy('createdAt', 'desc') 
        );
    } else {
        // Trường hợp không có Session ID, lấy TẤT CẢ video trong Course
        q = query(videosRef, orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
        let videos: Video[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;

            return {
                id: doc.id,
                courseId: data.courseId as string,
                sessionId: data.sessionId as string, // ĐỌC FIELD sessionId
                title: data.title as string,
                videoUrl: data.videoUrl as string,
                storagePath: data.storagePath as string, 
                adminId: data.adminId as string,
                createdAt: createdAtTimestamp?.toMillis() || Date.now(), 
            } as Video;
        });

        // Có thể sắp xếp client-side nếu cần (hiện tại đã orderBy('createdAt', 'desc'))
        
        callback(videos);
    }, (error: FirestoreError) => {
        console.error(`Lỗi lắng nghe Video cho Course ID ${courseId}:`, error);
    });

    return unsubscribe;
};

// =================================================================
// 11. ENROLLMENTS & ACCESS MANAGEMENT (Giữ nguyên)
// =================================================================

/**
 * Lắng nghe real-time tất cả các bản ghi ghi danh của một người dùng.
 */
export const subscribeToUserEnrollments = (userId: string, callback: (enrollments: Enrollment[]) => void): (() => void) => {
    const enrollmentsRef = getEnrollmentsCollectionRef();
    const q = query(enrollmentsRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const enrollments: Enrollment[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                userId: data.userId as string,
                courseId: data.courseId as string,
                status: data.status as 'active' | 'completed' | 'pending',
                enrolledAt: (data.enrolledAt as Timestamp)?.toDate() || new Date(), 
            } as Enrollment;
        });
        callback(enrollments);
    }, (error: FirestoreError) => {
        console.error("Lỗi khi lắng nghe Enrollment của User:", error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Admin: Ghi danh người dùng vào một khóa học.
 */
export async function enrollUser(userId: string, courseId: string): Promise<void> {
    const enrollmentsRef = getEnrollmentsCollectionRef();
    // Tạo ID Document kết hợp: {userId}_{courseId}
    const enrollmentId = `${userId}_${courseId}`; 

    await setDoc(doc(enrollmentsRef, enrollmentId), { 
        userId,
        courseId,
        status: 'active',
        enrolledAt: serverTimestamp(),
    });
    console.log(`User ${userId} enrolled in course ${courseId}.`);
}

/**
 * Admin: Hủy ghi danh người dùng khỏi một khóa học.
 */
export async function unenrollUser(userId: string, courseId: string): Promise<boolean> {
    const enrollmentsRef = getEnrollmentsCollectionRef();
    
    // Tạo ID Document kết hợp để tìm kiếm
    const enrollmentId = `${userId}_${courseId}`; 

    // SỬ DỤNG doc() và deleteDoc() trực tiếp với ID đã biết
    const docRef = doc(enrollmentsRef, enrollmentId);
    
    try {
        await deleteDoc(docRef);
        console.log(`User ${userId} unenrolled from course ${courseId} successfully.`);
        return true;
    } catch (e) {
        // Lỗi thường xảy ra nếu document không tồn tại, có thể bỏ qua
        console.warn(`Attempted to unenroll, but record not found for user ${userId} and course ${courseId}.`);
        return false;
    }
}

// =================================================================
// EXPORTS CẦN THIẾT CHO CÁC COMPONENT SỬ DỤNG STORAGE
// =================================================================

export { 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    createVideo as addVideo, 
};