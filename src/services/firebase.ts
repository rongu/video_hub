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
} from 'firebase/firestore';

// BỔ SUNG CÁC FIREBASE STORAGE IMPORTS CHO QUẢN LÝ VIDEO
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject,
    uploadBytesResumable, // <<< ĐÃ THÊM: Cần cho progress bar upload
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
// 2. GLOBAL & TYPES (CẬP NHẬT: THÊM STORAGE)
// =================================================================

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
export let storage: ReturnType<typeof getStorage> | null = null; // <<< SỬA: Export biến storage

/**
 * CẬP NHẬT: Thêm storagePath và bỏ duration/order/createdAt mặc định.
 * Thêm URL và Storage Path. BỎ duration và order (sẽ được tính client-side).
 */
export interface Video {
    id: string;
    courseId: string; // Thêm để query dễ hơn
    title: string;
    videoUrl: string; // URL tải về trực tiếp từ Firebase Storage
    storagePath: string; // Đường dẫn trong Storage
    adminId: string;
    // Bỏ các trường order, duration, url cũ của bạn, thay bằng videoUrl/storagePath
    // Bỏ createdAt/updatedAt khỏi interface vì chúng ta không muốn gửi nó lên payload
    createdAt: number; // milliseconds
}

export interface Course {
    id: string;
    title: string;
    description: string;
    createdAt: Date; 
    updatedAt: Date;
    adminId: string; 
    videoCount: number;
    // Cần thêm imageUrl (Tạm thời không dùng, nhưng nên có)
    //imageUrl: string; 
}

// Cấu trúc của Bản ghi Ghi danh (Enrollment)
export interface Enrollment {
    userId: string;
    courseId: string;
    enrolledAt: Date | string; 
    status: 'active' | 'completed' | 'pending';
}

// =================================================================
// 3. INITIALIZATION (CẬP NHẬT: THÊM STORAGE)
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
        storage = getStorage(app); // Khởi tạo Storage
        
        console.log("Firebase services initialized successfully.");
        
    } catch (error) {
        console.error("Lỗi khi khởi tạo Firebase:", error);
        if (!auth) {
            console.warn("Auth service failed to initialize properly.");
        }
    }
}

// =================================================================
// 4. GETTERS (CẬP NHẬT: THÊM STORAGE)
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
// 5. PATHS (Đường dẫn Firestore)
// =================================================================
// (GIỮ NGUYÊN CÁC HÀM PATHS CỦA BẠN)
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

/** Trả về collection reference cho Sub-Collection videos của một Khóa học */
export const getVideosCollectionRef = (courseId: string) => {
    const coursesRef = getCoursesCollectionRef();
    return collection(coursesRef, courseId, 'videos');
};

/** Trả về collection reference cho các bản ghi ghi danh (Enrollments) */
export const getEnrollmentsCollectionRef = () => {
    const firestore = getFirestoreDb();
    return collection(firestore, `artifacts/${APP_ID_ROOT}/public/data/enrollments`);
};

// =================================================================
// 6. AUTH HANDLERS
// =================================================================
// (GIỮ NGUYÊN CÁC HÀM AUTH CỦA BẠN)

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
// 7. COURSE MANAGEMENT
// =================================================================
// (GIỮ NGUYÊN CÁC HÀM COURSE CỦA BẠN)

/** Lắng nghe tất cả các khóa học trong real-time. */
export const subscribeToCourses = (callback: (courses: Course[]) => void): () => void => {
    const coursesRef = getCoursesCollectionRef();
    const q = query(coursesRef, orderBy('createdAt', 'desc')); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const courses: Course[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title as string,
                description: data.description as string,
                videoCount: data.videoCount as number || 0,
                adminId: data.adminId as string,
                imageUrl: data.imageUrl as string || 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course+Image', // Thêm imageUrl (default)
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
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
export async function addCourse(title: string, description: string, adminId: string, imageUrl: string = ''): Promise<void> {
    const coursesRef = getCoursesCollectionRef();
    await addDoc(coursesRef, {
        title,
        description,
        adminId,
        imageUrl: imageUrl || 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course+Image', // Thêm imageUrl
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        videoCount: 0,
    });
}

/**
 * Lắng nghe real-time thông tin chi tiết của một khóa học.
 */
export const subscribeToCourseDetail = (courseId: string, callback: (course: Course | null) => void): (() => void) => {
    const courseDocRef = getCourseDocRef(courseId);

    const unsubscribe = onSnapshot(courseDocRef, (docSnap: DocumentSnapshot<DocumentData>) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const course: Course = {
                id: docSnap.id,
                title: data.title as string,
                description: data.description as string,
                videoCount: data.videoCount as number || 0,
                adminId: data.adminId as string,
                //imageUrl: data.imageUrl as string || 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course+Image', // Thêm imageUrl (default)
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
            };
            callback(course);
        } else {
            callback(null); // Khóa học không tồn tại
        }
    }, (error: FirestoreError) => {
        console.error(`Lỗi khi lắng nghe Chi tiết Khóa học ID ${courseId}:`, error);
        callback(null);
        throw error;
    });

    return unsubscribe;
};

/** Admin xóa một Khóa học */
export const deleteCourse = async (courseId: string): Promise<void> => {
    const courseDocRef = getCourseDocRef(courseId);
    await deleteDoc(courseDocRef);
    // TODO: Xóa tất cả Videos thuộc về Khóa học này (Level 4.3)
};


// =================================================================
// 8. VIDEO MANAGEMENT FUNCTIONS (CẬP NHẬT VÀ BỔ SUNG CHỨC NĂNG STORAGE)
// =================================================================

/**
 * Tạo một UUID duy nhất cho ID video.
 */
export const generateVideoId = () => uuidv4();

/**
 * Tải file video lên Firebase Storage.
 * Hàm này hiện tại dùng uploadBytes. Trong CreateVideoForm chúng ta dùng uploadBytesResumable
 * nên hàm này có thể không cần thiết nữa nếu ta xử lý upload trong component.
 */
export const uploadVideoFile = async (
    file: File, 
    courseId: string, 
    videoId: string
): Promise<{videoUrl: string, storagePath: string}> => {
    
    const storage = getFirebaseStorage();
    // Path: videos/{courseId}/{videoId}/unique_filename
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

/** * Admin thêm một video mới vào Sub-Collection của một Khóa học. 
 * HÀM NÀY ĐÃ ĐƯỢC THAY THẾ HOÀN TOÀN BẰNG createVideo
 * TÔI TẠO HÀM MỚI ĐỂ PHÙ HỢP VỚI CÁCH LÀM MULTI-UPLOAD
 */
export async function createVideo(
    courseId: string,
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
    const newVideoDocRef = doc(videosCollectionRef, videoId); // Sử dụng videoId làm Document ID
    const courseDocRef = getCourseDocRef(courseId);
    
    try {
        // 2. Tạo document Video (KHÔNG CÓ description/duration/order)
        batch.set(newVideoDocRef, {
            courseId,
            title,
            videoUrl,
            storagePath,
            adminId,
            createdAt: serverTimestamp(),
            // Thêm các trường cần thiết khác (nếu có)
        });
        
        // 3. Cập nhật videoCount của Khóa học
        batch.update(courseDocRef, {
            videoCount: increment(1), // Tăng videoCount lên 1
            updatedAt: serverTimestamp(),
        });

        // 4. Commit
        await batch.commit();
        
        return videoId;
        
    } catch (e) {
        console.error("Lỗi khi tạo video hoặc cập nhật Khóa học:", e);
        throw new Error("Không thể lưu thông tin video. Vui lòng thử lại.");
    }
}

/**
 * Xóa video khỏi Firestore và Storage.
 */
export const deleteVideo = async (courseId: string, video: Video): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);

    // 1. Lấy References
    const videoDocRef = doc(getVideosCollectionRef(courseId), video.id);
    const courseDocRef = getCourseDocRef(courseId);
    const videoStorageRef = ref(storage, video.storagePath);

    try {
        // 2. Xóa file khỏi Storage
        await deleteObject(videoStorageRef);

        // 3. Thực hiện Batched Write
        // a) Xóa Document Video
        batch.delete(videoDocRef);

        // b) Cập nhật Course cha (Giảm số lượng)
        batch.update(courseDocRef, {
            videoCount: increment(-1), // Giảm videoCount đi 1
            updatedAt: serverTimestamp(),
        });

        // 4. Commit
        await batch.commit();

        console.log(`Video "${video.title}" đã được xóa thành công.`);
    } catch (e) {
        console.error("Lỗi khi xóa video hoặc cập nhật Khóa học:", e);
        // Ném lỗi lên để UI xử lý
        throw new Error("Không thể xóa video. Vui lòng kiểm tra quyền và thử lại.");
    }
};


/**
 * Lắng nghe real-time danh sách Video của một Khóa học.
 * @param courseId ID của Khóa học cha.
 * @param callback Hàm callback được gọi mỗi khi dữ liệu video thay đổi.
 * @returns Hàm unsubscribe để dừng lắng nghe.
 */
export const subscribeToVideos = (courseId: string, callback: (videos: Video[]) => void): () => void => {
    const videosRef = getVideosCollectionRef(courseId);
    
    // Sắp xếp client-side (trên trình duyệt) theo createdAt (cũ nhất lên trước)
    const q = query(videosRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let videos: Video[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp | undefined;

            return {
                id: doc.id,
                courseId: data.courseId as string, // Thêm courseId
                title: data.title as string,
                videoUrl: data.videoUrl as string,
                storagePath: data.storagePath as string, // Thêm storagePath
                adminId: data.adminId as string,
                createdAt: createdAtTimestamp?.toMillis() || Date.now(), 
            } as Video;
        });

        // Sắp xếp client-side theo thời gian tạo (cũ nhất lên trước, nghĩa là bài học đầu tiên)
        videos.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); 

        callback(videos);
    }, (error: FirestoreError) => {
        console.error(`Lỗi lắng nghe Video cho Course ID ${courseId}:`, error);
    });

    return unsubscribe;
};

// =================================================================
// 9. ENROLLMENTS & ACCESS MANAGEMENT
// =================================================================
// (GIỮ NGUYÊN CÁC HÀM ENROLLMENT CỦA BẠN)

/**
 * Lắng nghe real-time tất cả các bản ghi ghi danh của một người dùng.
 */
export const subscribeToUserEnrollments = (userId: string, callback: (enrollments: Enrollment[]) => void): () => void => {
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
    uploadBytesResumable, // <<< EXPORTED
    getDownloadURL, // <<< EXPORTED
    createVideo as addVideo, // <<< ALIAS: Export createVideo thành addVideo để CreateVideoForm.tsx dùng
};
