import { getDocs, collection, onSnapshot } from 'firebase/firestore';
import { getEnrollmentsCollectionRef, getFirestoreDb, getBaseUserPath } from './config';
import type { Enrollment } from './enrollments';

/**
 * Lắng nghe toàn bộ danh sách enrollment (dùng cho trang thống kê admin)
 */
export const subscribeToAllEnrollments = (callback: (enrollments: Enrollment[]) => void) => {
    return onSnapshot(getEnrollmentsCollectionRef(), (snap) => {
        callback(snap.docs.map(d => {
            const data = d.data();
            return {
                userId: data.userId,
                courseId: data.courseId,
                status: data.status,
                enrolledAt: data.enrolledAt?.toDate?.() || new Date(),
            } as Enrollment;
        }));
    }, (error) => {
        console.warn('subscribeToAllEnrollments: permission denied or unavailable.', error.code);
        callback([]);
    });
};

/**
 * Lấy số bài học đã hoàn thành của một user cụ thể
 */
export const fetchUserProgressCount = async (userId: string): Promise<number> => {
    const db = getFirestoreDb();
    const snap = await getDocs(collection(db, getBaseUserPath(userId), 'progress'));
    return snap.size;
};
