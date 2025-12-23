import { doc, serverTimestamp, writeBatch, increment, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject,  } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { getFirestoreDb, getFirebaseStorage, getVideosCollectionRef, getCourseDocRef, getCoursesCollectionRef } from './config';

// ✅ RE-EXPORT CÁC HÀM SDK CHO UI COMPONENTS
export { ref, uploadBytesResumable, getDownloadURL };

export interface Video {
    id: string;
    courseId: string;
    sessionId: string;
    title: string;
    videoUrl: string;
    storagePath: string;
    adminId: string;
    createdAt: number;
}

export const generateVideoId = () => uuidv4();

const getVideoDocRef = (courseId: string, videoId: string) => {
    const videosRef = getVideosCollectionRef(courseId);
    return doc(videosRef, videoId);
}

export async function addVideo(courseId: string, sessionId: string, title: string, videoUrl: string, storagePath: string, adminId: string, videoId: string): Promise<void> {
    const db = getFirestoreDb();
    const batch = writeBatch(db);
    const vRef = doc(getVideosCollectionRef(courseId), videoId);
    const sRef = doc(getCoursesCollectionRef(), courseId, 'sessions', sessionId);

    batch.set(vRef, { courseId, sessionId, title, videoUrl, storagePath, adminId, createdAt: serverTimestamp() });
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
    
    await deleteObject(ref(getFirebaseStorage(), storagePath)).catch(() => {});
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