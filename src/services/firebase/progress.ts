import { doc, setDoc, deleteDoc, query, where, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { getFirestoreDb, getCurrentAppId } from './config';

export const toggleVideoProgress = async (userId: string, courseId: string, videoId: string, completed: boolean) => {
    const ref = doc(getFirestoreDb(), 'artifacts', getCurrentAppId(), 'users', userId, 'progress', videoId);
    if (completed) {
        await setDoc(ref, { videoId, courseId, completed: true, updatedAt: serverTimestamp() });
    } else {
        await deleteDoc(ref);
    }
};

export const subscribeToUserProgress = (userId: string, courseId: string, callback: (ids: string[]) => void) => {
    const col = collection(getFirestoreDb(), 'artifacts', getCurrentAppId(), 'users', userId, 'progress');
    const q = query(col, where('courseId', '==', courseId));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => d.id)));
};