import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile,
    getAuth, 
    type User 
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app'; 
import { doc, setDoc, serverTimestamp, collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore';
// [FIX 1] Bỏ getAppUsersCollectionRef khỏi import config
import { getFirebaseAuth, getFirestoreDb, getBasePublicPath, firebaseConfig } from './config';

export interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'student';
    createdAt: number;
}

// [FIX 1] Định nghĩa lại hàm này tại đây thay vì import từ config
export const getAppUsersCollectionRef = () => collection(getFirestoreDb(), `${getBasePublicPath()}/users`);

export async function handleRegister(email: string, password: string, displayName: string): Promise<User> {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (cred.user) {
        await updateProfile(cred.user, { displayName });
        await setDoc(doc(getAppUsersCollectionRef(), cred.user.uid), {
            uid: cred.user.uid,
            displayName,
            email,
            role: 'student',
            createdAt: serverTimestamp(),
        });
    }
    return cred.user;
}

/**
 * Admin tạo User và Hồ sơ Firestore
 * Sử dụng Secondary App để tránh Admin bị logout khỏi phiên làm việc hiện tại
 */
export async function adminCreateUserAndProfile(email: string, password: string, displayName: string): Promise<AppUser> {
    // 1. Khởi tạo một App phụ (nếu chưa có) để thực hiện thao tác Auth biệt lập
    let secondaryApp;
    if (getApps().length > 1) {
        secondaryApp = getApps().find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
    } else {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
    }

    const secondaryAuth = getAuth(secondaryApp);

    // 2. Tạo user trên App phụ -> Không ảnh hưởng session của Main App (Admin đang login)
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;

    // 3. Update profile
    await updateProfile(user, { displayName });

    const userProfile: AppUser = {
        uid: user.uid,
        displayName,
        email,
        role: 'student',
        createdAt: Date.now(),
    };

    // 4. Ghi vào Firestore (Dùng DB chính của App)
    await setDoc(doc(getAppUsersCollectionRef(), user.uid), {
        ...userProfile,
        createdAt: serverTimestamp()
    });

    // 5. Sign out khỏi app phụ
    await signOut(secondaryAuth);

    return userProfile;
}

export async function handleLogin(email: string, password: string) {
    return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function handleSignOut() {
    await signOut(getFirebaseAuth());
}

export const subscribeToAppUsers = (callback: (users: AppUser[]) => void) => {
    const q = query(getAppUsersCollectionRef(), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => {
            // [FIX 2] Ép kiểu data về any để tránh lỗi 'unknown' khi spread
            const data = d.data() as any; 
            return {
                uid: d.id,
                ...data,
                // Kiểm tra an toàn cho createdAt
                createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
            } as AppUser;
        }));
    });
};