import { 
    query, orderBy, onSnapshot, doc, serverTimestamp, writeBatch, increment, getDocs, updateDoc, 
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { 
    getFirestoreDb, getFirebaseStorage, getCoursesCollectionRef, 
    getSessionsCollectionRef, getVideosCollectionRef, getCourseDocRef 
} from './config';

export interface Session {
    id: string;
    courseId: string;
    title: string;
    orderIndex: number;
    videoCount: number;
    parentId: string | null;
    createdAt: number;
}

export const subscribeToSessions = (courseId: string, callback: (sessions: Session[]) => void): (() => void) => {
    const q = query(getSessionsCollectionRef(courseId), orderBy('orderIndex', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toMillis() || Date.now(),
        } as Session));
        callback(sessions);
    });
};

export async function addSession(courseId: string, title: string, orderIndex: number, parentId: string | null = null): Promise<void> {
    const sessionRef = doc(getSessionsCollectionRef(courseId));
    const batch = writeBatch(getFirestoreDb());
    batch.set(sessionRef, {
        courseId, title, orderIndex, videoCount: 0, parentId,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await batch.commit();
}

export async function updateSession(courseId: string, sessionId: string, newTitle: string): Promise<void> {
    const sRef = doc(getSessionsCollectionRef(courseId), sessionId);
    await updateDoc(sRef, { title: newTitle, updatedAt: serverTimestamp() });
}

export const deleteSession = async (courseId: string, sessionId: string): Promise<void> => {
    const db = getFirestoreDb();
    const storage = getFirebaseStorage();
    const batch = writeBatch(db);
    const storagePathsToDelete: string[] = [];

    const allSessionsSnap = await getDocs(getSessionsCollectionRef(courseId));
    const allVideosSnap = await getDocs(getVideosCollectionRef(courseId));

    const allSessions = allSessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
    const allVideos = allVideosSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const idsToDelete = new Set<string>();
    const collect = (id: string) => {
        idsToDelete.add(id);
        allSessions.filter(s => s.parentId === id).forEach(c => collect(c.id));
    };
    collect(sessionId);

    idsToDelete.forEach(id => batch.delete(doc(getSessionsCollectionRef(courseId), id)));
    
    let deletedVideoCount = 0;
    allVideos.forEach(v => {
        if (idsToDelete.has(v.sessionId)) {
            batch.delete(doc(getVideosCollectionRef(courseId), v.id));
            deletedVideoCount++;
            if (v.storagePath) storagePathsToDelete.push(v.storagePath);
        }
    });

    batch.update(getCourseDocRef(courseId), {
        videoCount: increment(-deletedVideoCount),
        updatedAt: serverTimestamp()
    });

    await batch.commit();
    await Promise.all(storagePathsToDelete.map(p => deleteObject(ref(storage, p)).catch(() => {})));
};