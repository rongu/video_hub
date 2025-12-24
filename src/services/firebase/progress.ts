import { 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    serverTimestamp 
} from 'firebase/firestore';
import { getFirestoreDb, getBaseUserPath } from './config';

/**
 * Cập nhật tiến độ xem video
 */
export const toggleVideoProgress = async (userId: string, courseId: string, videoId: string, completed: boolean) => {
    if (!userId) return;
    const db = getFirestoreDb();
    const progressDocRef = doc(db, getBaseUserPath(userId), 'progress', videoId);

    if (completed) {
        await setDoc(progressDocRef, {
            videoId,
            courseId,
            completed: true,
            updatedAt: serverTimestamp()
        });
    } else {
        await deleteDoc(progressDocRef);
    }
};

/**
 * QUY TẮC 2: Lắng nghe tiến độ - Lọc bằng JavaScript thay vì query complex
 */
export const subscribeToUserProgress = (userId: string | undefined, courseId: string, callback: (completedIds: string[]) => void) => {
    if (!userId) {
        callback([]);
        return () => {};
    }

    const db = getFirestoreDb();
    const progressColRef = collection(db, getBaseUserPath(userId), 'progress');
    
    // Sử dụng snapshot đơn giản và lọc tại Client để tuân thủ Rule 2
    return onSnapshot(progressColRef, (snapshot) => {
        const completedIds = snapshot.docs
            .filter(doc => doc.data().courseId === courseId)
            .map(d => d.id);
        callback(completedIds);
    }, (error) => {
        console.error("Lỗi Progress Listener:", error);
        callback([]);
    });
};

/**
 * Lắng nghe toàn bộ tiến độ của User cho HomePage
 */
export const subscribeToAllUserProgress = (userId: string | undefined, callback: (progressMap: {[courseId: string]: number}) => void) => {
    if (!userId) {
        callback({});
        return () => {};
    }

    const db = getFirestoreDb();
    const progressColRef = collection(db, getBaseUserPath(userId), 'progress');

    return onSnapshot(progressColRef, (snapshot) => {
        const counts: {[courseId: string]: number} = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const cid = data.courseId;
            if (cid) {
                counts[cid] = (counts[cid] || 0) + 1;
            }
        });
        callback(counts);
    }, (error) => {
        console.error("Lỗi All Progress Listener:", error);
        callback({});
    });
};