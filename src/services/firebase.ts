import { getApp, getApps } from 'firebase/app';
import { getAuth, type Auth, signInAnonymously, signInWithCustomToken, signOut, type User } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore'; 

setLogLevel('debug'); // Bật log debug cho Firestore

// Global variables provided by the Canvas environment
declare const __app_id: string;

// Hàm helper để lấy instance Firebase App đã được khởi tạo
const getFirebaseApp = () => {
    // Nếu chưa có app nào, có nghĩa là App.tsx chưa chạy qua initializeApp (chưa sẵn sàng)
    if (getApps().length === 0) {
        return undefined;
    }
    // Lấy instance app mặc định
    return getApp();
};

let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;

// Hàm export auth (được gọi bởi các trang Auth)
export const getFirebaseAuth = (): Auth | undefined => {
    // Nếu đã có instance, trả về luôn
    if (authInstance) return authInstance;

    const app = getFirebaseApp();
    if (app) {
        authInstance = getAuth(app);
        return authInstance;
    }
    return undefined; // Trả về undefined nếu App chưa sẵn sàng
};

// Hàm export db
export const getFirebaseDB = (): Firestore | undefined => {
    // Nếu đã có instance, trả về luôn
    if (dbInstance) return dbInstance;

    const app = getFirebaseApp();
    if (app) {
        dbInstance = getFirestore(app);
        return dbInstance;
    }
    return undefined;
};

/**
 * Lấy đường dẫn collection an toàn cho người dùng hiện tại.
 * Dữ liệu được lưu tại /artifacts/{appId}/users/{userId}/transactions
 * @param userId ID của người dùng (từ Auth)
 * @returns Đường dẫn collection Firestore
 */
export const getTransactionCollectionPath = (userId: string) => {
    // __app_id là biến global được cung cấp bởi môi trường canvas
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    
    // Lưu ý: Chúng ta đang sử dụng dữ liệu riêng tư (users/{userId})
    return `artifacts/${appId}/users/${userId}/transactions`;
};

/**
 * Đăng xuất người dùng.
 */
export const handleSignOut = async () => {
    const authInstance = getFirebaseAuth();
    if (authInstance) {
        await signOut(authInstance); 
    }
};
