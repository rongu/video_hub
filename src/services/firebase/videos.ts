import { doc, serverTimestamp, writeBatch, increment, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject,  } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFirestoreDb, getFirebaseStorage, getVideosCollectionRef, getCourseDocRef, getCoursesCollectionRef } from './config';

// ✅ RE-EXPORT CÁC HÀM SDK CHO UI COMPONENTS
export { ref, uploadBytesResumable, getDownloadURL };

// =================================================================
// 1. ĐỊNH NGHĨA TYPE CHO RICH LESSON (TEMPLATE BLOCK)
// =================================================================

// Thêm 'audio' và 'custom' vào LessonType
export type LessonType = 'video' | 'quiz' | 'text' | 'custom' | 'audio';

// -- Sub-types cho các thành phần trong Block --

export interface BlockAudio {
    id: string;
    url: string;
    name: string;
}

export interface BlockImage {
    id: string;
    url: string;
    caption?: string;
    isSpoiler?: boolean; // True = bị che mờ, click mới hiện
}

export interface BlockQuiz {
    id: string;
    question: string;
    answers: string[];
    correctIndex: number;
    explanation?: string; // Giải thích hiển thị sau khi chọn
}

export interface LessonBlock {
    id: string;
    title: string;
    description?: string; // Hỗ trợ Markdown
    audios?: BlockAudio[];
    images?: BlockImage[];
    quizzes?: BlockQuiz[];
}

export interface Video {
    id: string;
    courseId: string;
    sessionId: string;
    title: string;
    adminId: string;
    createdAt: number;
    type?: LessonType;

    // -- Data riêng cho từng loại --
    
    // 1. Video thường
    videoUrl?: string;       
    storagePath?: string;    
    
    // 2. Bài giảng Text (Markdown)
    content?: string;        
    
    // 3. Bài kiểm tra (Quiz lớn - tính điểm)
    quizData?: string; 
    
    // 4. Bài giảng Audio
    audioUrl?: string; 
    
    // 5. Custom Rich Lesson (Template mới)
    blockData?: LessonBlock[]; 
}

export const generateVideoId = () => uuidv4();

const getVideoDocRef = (courseId: string, videoId: string) => {
    const videosRef = getVideosCollectionRef(courseId);
    return doc(videosRef, videoId);
}

// =================================================================
// 2. CẬP NHẬT HÀM ADD VIDEO (HỖ TRỢ ĐẦY ĐỦ THAM SỐ)
// =================================================================

export async function addVideo(
    courseId: string, 
    sessionId: string, 
    title: string, 
    videoUrl: string, 
    storagePath: string, 
    adminId: string, 
    videoId: string,
    type: LessonType = 'video',
    // Các tham số optional cho từng loại
    content: string = '',
    quizData: string = '',
    blockData: LessonBlock[] = [], // <--- Tham số mới cho Custom Template
    audioUrl: string = ''          // <--- Tham số mới cho Audio
): Promise<void> {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const vRef = doc(getVideosCollectionRef(courseId), videoId);
    const sRef = doc(getCoursesCollectionRef(), courseId, 'sessions', sessionId);

    // Data chung
    const docData: any = { 
        courseId, 
        sessionId, 
        title, 
        adminId, 
        createdAt: serverTimestamp(),
        type 
    };

    // Mapping Data theo Type
    if (type === 'video') {
        docData.videoUrl = videoUrl;
        docData.storagePath = storagePath;
    } else if (type === 'text') {
        docData.content = content;
    } else if (type === 'quiz') {
        docData.quizData = quizData;
    } else if (type === 'audio') {
        docData.audioUrl = audioUrl;
        docData.storagePath = storagePath; // Lưu path file để xóa
        docData.content = content; // Transcript
    } else if (type === 'custom') {
        docData.blockData = blockData;     // Lưu cấu trúc Blocks
        docData.storagePath = storagePath; // Lưu path folder assets (nếu có)
    }

    batch.set(vRef, docData);
    batch.update(getCourseDocRef(courseId), { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    await batch.commit();
}

export const subscribeToVideos = (courseId: string, sessionId: string | null, callback: (videos: Video[]) => void): (() => void) => {
    const colRef = getVideosCollectionRef(courseId);
    
    // [UPDATE QUAN TRỌNG] Đổi 'desc' thành 'asc' để bài học sắp xếp theo thứ tự tạo (Cũ -> Mới)
    const q = sessionId 
        ? query(colRef, where('sessionId', '==', sessionId), orderBy('createdAt', 'asc')) 
        : query(colRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toMillis() || Date.now() } as Video)));
    });
};

export const deleteVideo = async (courseId: string, sessionId: string, videoId: string, storagePath: string): Promise<void> => {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const sRef = doc(getCoursesCollectionRef(), courseId, 'sessions', sessionId);
    
    // Nếu có storagePath (Video file hoặc Folder assets của bài Custom)
    if (storagePath) {
        // Lưu ý: deleteObject chỉ xóa được File. 
        // Nếu storagePath là folder (Type Custom), logic xóa folder đệ quy cần xử lý ở Client (loop) hoặc Cloud Function.
        // Tạm thời try-catch để tránh lỗi nếu path là folder.
        await deleteObject(ref(getFirebaseStorage(), storagePath)).catch((err) => {
            console.warn("Could not delete object at path (might be a folder):", storagePath, err);
        });
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