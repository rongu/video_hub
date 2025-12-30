import { 
    query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, 
    updateDoc, getDocs, writeBatch, type Timestamp ,
} from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestoreDb, getFirebaseStorage, getVideosCollectionRef, getCourseDocRef, getCoursesCollectionRef } from './config';
import { type Video } from './videos';

export interface Course {
    id: string;
    title: string;
    description: string;
    createdAt: number;
    updatedAt: number;
    adminId: string;
    videoCount: number;
    imageUrl?: string;
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

// BỔ SUNG: Hàm upload ảnh khóa học
export async function uploadCourseImage(file: File): Promise<string> {
    const storage = getFirebaseStorage();
    // Tạo đường dẫn file: course_images/timestamp_filename
    const storagePath = `course_images/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
}

export async function addCourse(data: any) {
    await addDoc(getCoursesCollectionRef(), {
        ...data,
        // Nếu không có imageUrl thì mới dùng ảnh mặc định
        imageUrl: data.imageUrl || 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        videoCount: 0,
    });
}

export async function updateCourse(courseId: string, data: { title?: string; description?: string; imageUrl?: string }): Promise<void> {
    await updateDoc(getCourseDocRef(courseId), { ...data, updatedAt: serverTimestamp() });
}

/**
 * ✅ BỔ SUNG: Xóa Khóa học và toàn bộ Video liên quan + Ảnh bìa
 */
export const deleteCourse = async (courseId: string): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);

    const courseDocRef = getCourseDocRef(courseId);
    
    // [UPDATE 1]: Lấy thông tin Course trước để tìm ảnh bìa cần xóa
    const courseSnap = await getDoc(courseDocRef);
    if (!courseSnap.exists()) {
        throw new Error("Khóa học không tồn tại!");
    }
    const courseData = courseSnap.data() as Course;
    
    const videosRef = getVideosCollectionRef(courseId);
    
    // 1. Lấy tất cả Video Docs trong Sub-collection
    const videosSnapshot = await getDocs(videosRef);
    
    const storagePaths: string[] = [];
    
    // [UPDATE 2]: Thêm ảnh bìa vào danh sách xóa (nếu là ảnh host trên Firebase)
    if (courseData.imageUrl && courseData.imageUrl.includes('firebasestorage')) {
        try {
            // Tạo ref từ URL để lấy full path
            const imageRef = ref(storage, courseData.imageUrl);
            storagePaths.push(imageRef.fullPath);
        } catch (e) {
            console.warn("Không thể lấy path từ Image URL, bỏ qua xóa ảnh bìa.", e);
        }
    }

    videosSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Video;
        // Thêm đường dẫn Storage của video vào danh sách xóa
        if (data.storagePath) {
            storagePaths.push(data.storagePath);
        }
        // Thêm document video vào batch để xóa
        batch.delete(docSnap.ref); 
    });

    // 2. Xóa tất cả file trong Storage (bước này không dùng batch)
    // Dùng Promise.allSettled hoặc catch từng cái để đảm bảo không chết luồng
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
    
    // 3. Xóa document Khóa học chính
    batch.delete(courseDocRef);

    // 4. Commit batch: Xóa tất cả document (video + course)
    try {
        await batch.commit();
        
        // 5. BƯỚC XÁC MINH
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