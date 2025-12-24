import { useState, useEffect } from 'react';
import { subscribeToUserProgress } from '../services/firebase';

/**
 * Hook theo dõi tiến độ học tập của User
 */
export const useUserProgress = (userId: string | undefined, courseId: string | null) => {
    const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(true);

    useEffect(() => {
        if (!userId || !courseId) {
            setCompletedVideoIds([]);
            setLoadingProgress(false);
            return;
        }

        setLoadingProgress(true);
        const unsubscribe = subscribeToUserProgress(userId, courseId, (ids) => {
            setCompletedVideoIds(ids);
            setLoadingProgress(false);
        });

        return () => unsubscribe();
    }, [userId, courseId]);

    return { completedVideoIds, loadingProgress };
};

export default useUserProgress;