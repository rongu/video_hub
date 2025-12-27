import { 
    query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, 
    updateDoc, getDocs, writeBatch, type Timestamp ,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
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

export async function addCourse(data: any) {
    await addDoc(getCoursesCollectionRef(), {
        ...data,
        imageUrl: 'https://placehold.co/600x400/818CF8/FFFFFF?text=Course',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        videoCount: 0,
    });
}

export async function updateCourse(courseId: string, data: { title?: string; description?: string }): Promise<void> {
    await updateDoc(getCourseDocRef(courseId), { ...data, updatedAt: serverTimestamp() });
}

/**
 * ✅ BỔ SUNG: Xóa Khóa học và toàn bộ Video liên quan
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