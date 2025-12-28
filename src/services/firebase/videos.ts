import { doc, serverTimestamp, writeBatch, increment, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject,  } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFirestoreDb, getFirebaseStorage, getVideosCollectionRef, getCourseDocRef, getCoursesCollectionRef } from './config';

// ✅ RE-EXPORT CÁC HÀM SDK CHO UI COMPONENTS
export { ref, uploadBytesResumable, getDownloadURL };

// 1. ĐỊNH NGHĨA TYPE MỚI
export type LessonType = 'video' | 'quiz' | 'text';

export interface Video {
    id: string;
    courseId: string;
    sessionId: string;
    title: string;
    videoUrl?: string; // Optional: chỉ dùng cho type='video'
    storagePath?: string; // Optional: chỉ dùng cho type='video'
    adminId: string;
    createdAt: number;
    
    // CÁC TRƯỜNG BỔ SUNG CHO ĐA PHƯƠNG TIỆN
    type?: LessonType; // Mặc định là 'video'
    content?: string;  // Dùng cho bài giảng text (HTML/Markdown)
    quizData?: string; // Dùng lưu JSON string của danh sách câu hỏi
}

export const generateVideoId = () => uuidv4();

const getVideoDocRef = (courseId: string, videoId: string) => {
    const videosRef = getVideosCollectionRef(courseId);
    return doc(videosRef, videoId);
}

// CẬP NHẬT HÀM ADD VIDEO ĐỂ NHẬN THÊM THAM SỐ
export async function addVideo(
    courseId: string, 
    sessionId: string, 
    title: string, 
    videoUrl: string, 
    storagePath: string, 
    adminId: string, 
    videoId: string,
    // Tham số mới (optional)
    type: LessonType = 'video',
    content: string = '',
    quizData: string = ''
): Promise<void> {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const vRef = doc(getVideosCollectionRef(courseId), videoId);
    const sRef = doc(getCoursesCollectionRef(), courseId, 'sessions', sessionId);

    // Tạo object data cơ bản
    const docData: any = { 
        courseId, 
        sessionId, 
        title, 
        adminId, 
        createdAt: serverTimestamp(),
        type 
    };

    // Chỉ thêm các trường cần thiết theo type
    if (type === 'video') {
        docData.videoUrl = videoUrl;
        docData.storagePath = storagePath;
    } else if (type === 'text') {
        docData.content = content;
        // Text lesson không cần videoUrl, storagePath
    } else if (type === 'quiz') {
        docData.quizData = quizData;
    }

    batch.set(vRef, docData);
    batch.update(getCourseDocRef(courseId), { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    await batch.commit();
}

export const subscribeToVideos = (courseId: string, sessionId: string | null, callback: (videos: Video[]) => void): (() => void) => {
    const colRef = getVideosCollectionRef(courseId);
    const q = sessionId ? query(colRef, where('sessionId', '==', sessionId), orderBy('createdAt', 'desc')) : query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toMillis() || Date.now() } as Video)));
    });
};

export const deleteVideo = async (courseId: string, sessionId: string, videoId: string, storagePath: string): Promise<void> => {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const sRef = doc(getCoursesCollectionRef(), courseId, 'sessions', sessionId);
    
    // Chỉ xóa trên Storage nếu có đường dẫn (Video)
    if (storagePath) {
        await deleteObject(ref(getFirebaseStorage(), storagePath)).catch(() => {});
    }

    batch.delete(doc(getVideosCollectionRef(courseId), videoId));
    batch.update(getCourseDocRef(courseId), { videoCount: increment(-1), updatedAt: serverTimestamp() });
    batch.update(sRef, { videoCount: increment(-1), updatedAt: serverTimestamp() });
    await batch.commit();
};

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