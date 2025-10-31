import { useState, useEffect } from 'react';

// Đảm bảo import đúng interface Session và hàm subscribeToSessions
import { type Session, subscribeToSessions } from '../services/firebase'; 

/**
 * Hook tùy chỉnh để lắng nghe danh sách Sessions của một Khóa học theo thời gian thực (real-time).
 * Sessions sẽ được sắp xếp theo orderIndex (đã được định nghĩa trong firebase.ts).
 * * @param courseId ID của Khóa học cần lấy Sessions.
 * @returns {Session[] | undefined} Danh sách Sessions đã sắp xếp, hoặc undefined nếu đang tải.
 */
export const useCourseSessions = (courseId: string | null): Session[] | undefined => {
    // undefined: đang tải
    // []: đã tải xong nhưng không có session nào
    const [sessions, setSessions] = useState<Session[] | undefined>(undefined);

    useEffect(() => {
        // 1. Kiểm tra: Nếu không có courseId, reset sessions và thoát
        if (!courseId) {
            setSessions(undefined);
            return;
        }

        // 2. Bắt đầu lắng nghe sessions từ Firebase
        // subscribeToSessions là hàm real-time từ firebase.ts (Bước 1)
        const unsubscribe = subscribeToSessions(courseId, (fetchedSessions) => {
            // Cập nhật state với dữ liệu mới nhất (đã được sắp xếp)
            setSessions(fetchedSessions);
        });

        // 3. Cleanup: Hủy lắng nghe khi component unmount hoặc courseId thay đổi
        return () => unsubscribe();
    }, [courseId]); // Chạy lại khi courseId thay đổi

    return sessions;
};