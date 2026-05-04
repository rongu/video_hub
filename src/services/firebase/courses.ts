import { 
    query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, 
    updateDoc, getDocs, writeBatch, type Timestamp 
} from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestoreDb, getFirebaseStorage, getVideosCollectionRef, getCourseDocRef, getCoursesCollectionRef, type MultilingualField } from './config';
import { type Video } from './videos';

// [UPDATE] Cập nhật Interface Course để dùng MultilingualField
export interface Course {
    id: string;
    title: MultilingualField;        // Sửa từ string -> MultilingualField
    description: MultilingualField;  // Sửa từ string -> MultilingualField
    createdAt: number;
    updatedAt: number;
    adminId: string;
    videoCount: number;
    imageUrl?: string;
    categoryIds?: string[];           // Danh sách ID của các category
}

export const subscribeToCourses = (callback: (courses: Course[]) => void) => {
    const q = query(getCoursesCollectionRef(), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: (d.data().createdAt as Timestamp)?.toMillis() || Date.now(),
            updatedAt: (d.data().updatedAt as Timestamp)?.toMillis() || Date.now(),
        } as Course)));
    });
};

export async function uploadCourseImage(file: File): Promise<string> {
    const storage = getFirebaseStorage();
    const storagePath = `course_images/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
}

// [UPDATE] Cập nhật type cho hàm addCourse
export async function addCourse(data: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'videoCount'>) {
    await addDoc(getCoursesCollectionRef(), {
        ...data,
        imageUrl: data.imageUrl || 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        videoCount: 0,
    });
}

// [UPDATE] Cập nhật type cho hàm updateCourse để nhận MultilingualField
export async function updateCourse(
    courseId: string, 
    data: { 
        title?: MultilingualField; 
        description?: MultilingualField; 
        imageUrl?: string 
    }
): Promise<void> {
    await updateDoc(getCourseDocRef(courseId), { ...data, updatedAt: serverTimestamp() });
}

export const deleteCourse = async (courseId: string): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);

    const courseDocRef = getCourseDocRef(courseId);
    
    const courseSnap = await getDoc(courseDocRef);
    if (!courseSnap.exists()) {
        throw new Error("Khóa học không tồn tại!");
    }
    const courseData = courseSnap.data() as Course;
    
    const videosRef = getVideosCollectionRef(courseId);
    const videosSnapshot = await getDocs(videosRef);
    
    const storagePaths: string[] = [];
    
    if (courseData.imageUrl && courseData.imageUrl.includes('firebasestorage')) {
        try {
            const imageRef = ref(storage, courseData.imageUrl);
            storagePaths.push(imageRef.fullPath);
        } catch (e) {
            console.warn("Không thể lấy path từ Image URL, bỏ qua xóa ảnh bìa.", e);
        }
    }

    videosSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Video;
        if (data.storagePath) {
            storagePaths.push(data.storagePath);
        }
        batch.delete(docSnap.ref); 
    });

    const deletionPromises = storagePaths.map(path => {
        try {
            const fileRef = ref(storage, path);
            return deleteObject(fileRef).catch(err => {
                console.warn(`File ${path} có thể không tồn tại hoặc lỗi xóa:`, err);
            });
        } catch (e) {
            console.warn(`Lỗi tạo ref cho ${path}`, e);
            return Promise.resolve();
        }
    });
    
    await Promise.all(deletionPromises);
    batch.delete(courseDocRef);

    try {
        await batch.commit();
        const docCheck = await getDoc(courseDocRef);
        if (docCheck.exists()) {
            console.error(`🔴 XÓA KHÔNG THÀNH CÔNG: Document Khóa học ID ${courseId} VẪN TỒN TẠI.`);
        } else {
            console.log(`✅ Đã xóa thành công Khóa học ID: ${courseId}`);
        }
    } catch (error) {
        console.error(`❌ LỖI XÓA KHÓA HỌC ID: ${courseId}.`, error);
        throw new Error("Xóa Khóa học thất bại.");
    }
};

export const subscribeToCourseDetail = (courseId: string, callback: (course: Course | null) => void): (() => void) => {
    return onSnapshot(getCourseDocRef(courseId), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                id: docSnap.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
                updatedAt: (data.updatedAt as Timestamp)?.toMillis() || Date.now(),
            } as Course);
        } else {
            callback(null);
        }
    });
};