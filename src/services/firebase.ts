import { getApp, getApps } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

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
