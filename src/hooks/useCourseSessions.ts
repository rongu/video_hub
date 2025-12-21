import { useState, useEffect } from 'react';
import { type Session, subscribeToSessions } from '../services/firebase'; 

/**
 * Hook lắng nghe danh sách Sessions của một Khóa học.
 * Khớp với API 2 tham số: (courseId, callback)
 */
export const useCourseSessions = (courseId: string | null): [Session[], boolean, string | null] => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId) {
            setSessions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // ✅ Gọi với đúng 2 tham số theo bản base của bạn
        const unsubscribe = subscribeToSessions(courseId, (fetchedSessions) => {
            setSessions(fetchedSessions);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [courseId]); 

    return [sessions, loading, error];
};

export default useCourseSessions;