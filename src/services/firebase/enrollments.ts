import { doc, setDoc, deleteDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getEnrollmentsCollectionRef } from './config';

export interface Enrollment {
    userId: string;
    courseId: string;
    status: 'active' | 'completed' | 'pending';
    enrolledAt: Date;
}

export const subscribeToUserEnrollments = (userId: string, callback: (enrollments: Enrollment[]) => void) => {
    const q = query(getEnrollmentsCollectionRef(), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ ...d.data(), enrolledAt: d.data().enrolledAt?.toDate() || new Date() } as Enrollment)));
    });
};

export async function enrollUser(userId: string, courseId: string) {
    await setDoc(doc(getEnrollmentsCollectionRef(), `${userId}_${courseId}`), { userId, courseId, status: 'active', enrolledAt: serverTimestamp() });
}

export async function unenrollUser(userId: string, courseId: string) {
    await deleteDoc(doc(getEnrollmentsCollectionRef(), `${userId}_${courseId}`));
}