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
import { v4 as uuidv4 } from 'uuid'; // Thêm UUID cho ID video

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
// 2. GLOBAL & TYPES (BỔ SUNG INTERFACE Session)
// =================================================================

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
export let storage: ReturnType<typeof getStorage> | null = null; 

export interface Video {
    id: string;
    courseId: string;
    // BỔ SUNG: Thêm sessionId
    sessionId: string; 
    title: string;
    videoUrl: string; 
    storagePath: string; 
    adminId: string;
    createdAt: number; // milliseconds
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
 * FIX: Đổi kiểu dữ liệu của createdAt và updatedAt thành number để khớp với formatDate.
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
}

// Cấu trúc của Bản ghi Ghi danh (Enrollment)
export interface Enrollment {
    userId: string;
    courseId: string;
    enrolledAt: Date | string; 
    status: 'active' | 'completed' | 'pending';
}

// =================================================================
// 3. INITIALIZATION 
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

export const getFirebaseStorage = (): ReturnType<typeof getStorage> => {
    if (!storage) {
        throw new Error("Firebase Storage chưa được khởi tạo. Hãy đảm bảo gọi initializeAndAuthenticate trước.");
    }
    return storage;
};

export const getCurrentAppId = (): string => APP_ID_ROOT;

// =================================================================
// 5. PATHS (BỔ SUNG PATHS CHO SESSION)
// =================================================================

/** Trả về document reference cho profile người dùng hiện tại */
export const getUserDocumentPath = (uid: string) => {
    const firestore = getFirestoreDb();
    return doc(firestore, `artifacts/${APP_ID_ROOT}/users/${uid}/profile/user_data`);
};

/** Trả về collection reference cho các khóa học công khai */
export const getCoursesCollectionRef = () => {
    const firestore = getFirestoreDb();
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
    return collection(coursesRef, courseId, 'sessions'); // Path: /courses/{courseId}/sessions
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
    return collection(firestore, `artifacts/${APP_ID_ROOT}/public/data/enrollments`);
};

// =================================================================
// 6. AUTH HANDLERS (Giữ nguyên)
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
// 7. SESSION MANAGEMENT FUNCTIONS (BỔ SUNG)
// =================================================================

/**
 * Lắng nghe tất cả các Session của một Khóa học theo real-time.
 * Sắp xếp theo orderIndex (cũ nhất/index thấp nhất lên trước).
 */
export const subscribeToSessions = (courseId: string, callback: (sessions: Session[]) => void): () => void => {
    const sessionsRef = getSessionsCollectionRef(courseId);
    // Sắp xếp theo orderIndex để đảm bảo thứ tự luôn đúng
    const q = query(sessionsRef, orderBy('orderIndex', 'asc')); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessions: Session[] = snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;
            const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;

            return {
                id: doc.id,
                courseId: data.courseId as string,
                title: data.title as string,
                orderIndex: data.orderIndex as number || 0,
                videoCount: data.videoCount as number || 0,
                // 🟢 THAY ĐỔI: Đọc trường parentId. Mặc định là null nếu không có
                parentId: (data.parentId as string | null) || null, 
                createdAt: createdAtTimestamp?.toMillis() || Date.now(),
                updatedAt: updatedAtTimestamp?.toMillis() || Date.now(),
            } as Session;
        });

        callback(sessions);
    }, (error: FirestoreError) => {
        console.error(`Lỗi khi lắng nghe Session cho Course ID ${courseId}:`, error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Tạo một Session mới. Gán orderIndex bằng số lượng session hiện có + 1.
 * 🟢 THAY ĐỔI: Thêm tham số parentId.
 */
export async function addSession(
    courseId: string, 
    title: string, 
    currentSessionCount: number,
    parentId: string | null = null, // 🟢 THÊM: parentId
): Promise<void> {
    const sessionsRef = getSessionsCollectionRef(courseId);
    
    await addDoc(sessionsRef, {
        courseId,
        title,
        orderIndex: currentSessionCount + 1, // Index tiếp theo
        videoCount: 0,
        parentId: parentId, // 🟢 GHI: parentId vào Firestore
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Cập nhật tiêu đề của một Session. (Giữ nguyên)
 */
export async function updateSession(
    courseId: string, 
    sessionId: string, 
    newTitle: string
): Promise<void> {
    const sessionDocRef = getSessionDocRef(courseId, sessionId);
    
    await updateDoc(sessionDocRef, {
        title: newTitle,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Xóa Session và tất cả Video liên quan trong Session đó. (Giữ nguyên)
 * QUAN TRỌNG: Cần cập nhật videoCount của Course cha.
 */
export const deleteSession = async (courseId: string, sessionId: string): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);

    const sessionDocRef = getSessionDocRef(courseId, sessionId);
    const courseDocRef = getCourseDocRef(courseId);
    const videosRef = getVideosCollectionRef(courseId); // Lấy refs cho videos

    // 1. Lấy tất cả Video Docs thuộc Session này
    const videosQuery = query(videosRef, where('sessionId', '==', sessionId));
    const videosSnapshot = await getDocs(videosQuery);
    
    const storagePaths: string[] = [];
    let videosDeletedCount = 0;

    videosSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Video;
        if (data.storagePath) {
            storagePaths.push(data.storagePath);
        }
        // Thêm document video vào batch để xóa
        batch.delete(docSnap.ref); 
        videosDeletedCount++;
    });

    // 2. Xóa tất cả file trong Storage (bước này không dùng batch)
    const deletionPromises = storagePaths.map(path => {
        try {
            const fileRef = ref(storage, path);
            return deleteObject(fileRef);
        } catch (e) {
            console.warn(`Không thể xóa file Storage tại ${path}. Có thể file không tồn tại. Tiếp tục...`);
            return Promise.resolve();
        }
    });
    
    await Promise.all(deletionPromises);
    
    // 3. Xóa document Session
    batch.delete(sessionDocRef);

    // 4. Cập nhật Course cha (Giảm tổng số video)
    if (videosDeletedCount > 0) {
        batch.update(courseDocRef, {
            videoCount: increment(-videosDeletedCount),
            updatedAt: serverTimestamp(),
        });
    }

    // 5. Commit batch
    try {
        await batch.commit();
        console.log(`✅ Đã xóa thành công Session ID: ${sessionId} và ${videosDeletedCount} video liên quan.`);
    } catch (error) {
        console.error(`❌ LỖI XÓA SESSION ID: ${sessionId}. KHÔNG THỂ COMMIT BATCH (Kiểm tra Security Rules):`, error);
        throw new Error("Xóa Session thất bại. Vui lòng kiểm tra Firebase Security Rules hoặc kết nối.");
    }
};

// =================================================================
// 8. COURSE MANAGEMENT (Giữ nguyên)
// =================================================================

/** Lắng nghe tất cả các khóa học trong real-time. */
export const subscribeToCourses = (callback: (courses: Course[]) => void): () => void => {
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

/** Admin tạo một khóa học mới. */
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

/** * Admin cập nhật Khóa học (Title/Description).
 * @param courseId ID của Khóa học.
 * @param updateData Dữ liệu muốn cập nhật (title, description).
 */
export async function updateCourse(
    courseId: string, 
    updateData: { title?: string; description?: string }
): Promise<void> {
    const courseDocRef = getCourseDocRef(courseId);
    
    // Đảm bảo không ghi đè createdAt, chỉ cập nhật updatedAt
    await updateDoc(courseDocRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
    });
}


/**
 * Admin xóa một Khóa học.
 * QUAN TRỌNG: Xóa tất cả Sub-collection Videos và các file Storage liên quan.
 * (Không cần xử lý Sessions ở đây, vì Sessions là sub-collection của Course. Việc xóa Course sẽ xóa sub-collection Sessions.)
 * @param courseId ID của Khóa học cần xóa.
 */
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
// 9. VIDEO MANAGEMENT FUNCTIONS (CẬP NHẬT: THÊM sessionId VÀO createVideo/deleteVideo)
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
    // Path: artifacts/{APP_ID_ROOT}/videos/{courseId}/{videoId}/unique_filename
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
    sessionId: string, // THÊM MỚI
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
    const sessionDocRef = getSessionDocRef(courseId, sessionId); // THÊM MỚI
    
    try {
        // 2. Tạo document Video 
        batch.set(newVideoDocRef, {
            courseId,
            sessionId, // THÊM FIELD sessionId
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
    sessionId: string, // THÊM MỚI
): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);

    // 1. Lấy References
    const videoDocRef = getVideoDocRef(courseId, videoId);
    const courseDocRef = getCourseDocRef(courseId);
    const sessionDocRef = getSessionDocRef(courseId, sessionId); // THÊM MỚI
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
        
        // c) Cập nhật Session cha (Giảm số lượng) (THÊM MỚI)
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
 * Lắng nghe real-time danh sách Video của một Khóa học. CẬP NHẬT: Đọc field sessionId
 */
export const subscribeToVideos = (courseId: string, callback: (videos: Video[]) => void): (() => void) => {
    const videosRef = getVideosCollectionRef(courseId);
    
    const q = query(videosRef);
    
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

        // Sắp xếp client-side theo thời gian tạo (cũ nhất lên trước)
        videos.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); 

        callback(videos);
    }, (error: FirestoreError) => {
        console.error(`Lỗi lắng nghe Video cho Course ID ${courseId}:`, error);
    });

    return unsubscribe;
};

// =================================================================
// 10. ENROLLMENTS & ACCESS MANAGEMENT (Giữ nguyên)
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
    await addDoc(enrollmentsRef, {
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
    
    const q = query(
        enrollmentsRef,
        where("userId", "==", userId),
        where("courseId", "==", courseId),
        limit(1) 
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docToDelete = snapshot.docs[0];
        await deleteDoc(doc(enrollmentsRef, docToDelete.id));
        console.log(`User ${userId} unenrolled from course ${courseId} successfully.`);
        return true;
    } else {
        console.warn(`Enrollment record not found for user ${userId} and course ${courseId}.`);
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