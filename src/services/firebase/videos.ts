import { doc, serverTimestamp, writeBatch, increment, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFirestoreDb, getFirebaseStorage, getVideosCollectionRef, getCourseDocRef, getCoursesCollectionRef, type MultilingualField } from './config';

// ✅ RE-EXPORT CÁC HÀM SDK CHO UI COMPONENTS
export { ref, uploadBytesResumable, getDownloadURL };

// =================================================================
// 1. ĐỊNH NGHĨA TYPE
// =================================================================

export type LessonType = 'video' | 'quiz' | 'text' | 'custom' | 'audio';

export interface BlockAudio {
    id: string;
    url: string;
    name: string;
}

export interface BlockImage {
    id: string;
    url: string;
    caption?: string;
    isSpoiler?: boolean; 
}

export interface BlockQuiz {
    id: string;
    question: string;
    answers: string[];
    correctIndex: number;
    explanation?: string;
}

export interface BlockVideo {
    id: string;
    name: string;
    url: string;
}

export interface BlockVocabulary {
    id: string;
    word: string;
    ipa: string;
    meaningVi: string;
    meaningJa: string;
    note?: string;
}

// [NEW] Interface cho Nhóm từ vựng (Table)
export interface BlockVocabularyGroup {
    id: string;
    title?: string;
    vocabularies: BlockVocabulary[];
}

export interface LessonBlock {
    id: string;
    description?: string;
    audios?: BlockAudio[];
    images?: BlockImage[];
    quizzes?: BlockQuiz[];
    videos?: BlockVideo[];
    
    // [NEW] Thay thế danh sách phẳng bằng danh sách nhóm
    vocabularyGroups?: BlockVocabularyGroup[];
    
    // [DEPRECATED] Giữ lại để tương thích data cũ (sẽ migrate runtime)
    vocabularies?: BlockVocabulary[]; 
    vocabularyListTitle?: string;
}

export interface Video {
    id: string;
    courseId: string;
    sessionId: string;
    title: string;
    adminId: string;
    createdAt: number;
    type?: LessonType;
    videoUrl?: string;       
    storagePath?: string;    
    content?: string;        
    quizData?: string; 
    audioUrl?: string; 
    blockData?: LessonBlock[]; 
}

export const generateVideoId = () => uuidv4();

const getVideoDocRef = (courseId: string, videoId: string) => {
    const videosRef = getVideosCollectionRef(courseId);
    return doc(videosRef, videoId);
}

// =================================================================
// 2. CÁC HÀM XỬ LÝ (ADD, UPDATE, DELETE...)
// =================================================================

export async function addVideo(
    courseId: string, 
    sessionId: string, 
    title: MultilingualField, 
    videoUrl: string, 
    storagePath: string, 
    adminId: string, 
    videoId: string,
    type: LessonType = 'video',
    content: MultilingualField = '',
    quizData: string = '',
    blockData: LessonBlock[] = [], 
    audioUrl: string = ''          
): Promise<void> {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const vRef = doc(getVideosCollectionRef(courseId), videoId);
    const sRef = doc(getCoursesCollectionRef(), courseId, 'sessions', sessionId);

    const docData: any = { 
        courseId, sessionId, title, adminId, createdAt: serverTimestamp(), type 
    };

    if (type === 'video') {
        docData.videoUrl = videoUrl;
        docData.storagePath = storagePath;
    } else if (type === 'text') {
        docData.content = content;
    } else if (type === 'quiz') {
        docData.quizData = quizData;
    } else if (type === 'audio') {
        docData.audioUrl = audioUrl;
        docData.storagePath = storagePath; 
        docData.content = content; 
    } else if (type === 'custom') {
        docData.blockData = blockData;     
        docData.storagePath = storagePath; 
    }

    batch.set(vRef, docData);
    batch.update(getCourseDocRef(courseId), { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    await batch.commit();
}

export const subscribeToVideos = (courseId: string, sessionId: string | null, callback: (videos: Video[]) => void): (() => void) => {
    const colRef = getVideosCollectionRef(courseId);
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
    
    if (storagePath) {
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
    updateData: Partial<Video> 
): Promise<void> {
    const videoDocRef = getVideoDocRef(courseId, videoId);
    const validData = Object.entries(updateData).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
    }, {} as any);
    await updateDoc(videoDocRef, validData);
}