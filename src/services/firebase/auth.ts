import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile,
    type User 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, orderBy, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb, getBasePublicPath } from './config';

export interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    role: 'admin' | 'student';
    createdAt: number;
}

export const getAppUsersCollectionRef = () => collection(getFirestoreDb(), `${getBasePublicPath()}/users`);

export async function handleRegister(email: string, password: string, displayName: string): Promise<User> {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await setDoc(doc(getAppUsersCollectionRef(), cred.user.uid), {
        uid: cred.user.uid,
        displayName,
        email,
        role: 'student',
        createdAt: serverTimestamp(),
    });
    return cred.user;
}

/**
 * ✅ BỔ SUNG: Admin tạo User và Hồ sơ Firestore
 */
export async function adminCreateUserAndProfile(email: string, password: string, displayName: string): Promise<AppUser> {
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName });

    const userProfile: AppUser = {
        uid: user.uid,
        displayName,
        email,
        role: 'student',
        createdAt: Date.now(),
    };

    await setDoc(doc(getAppUsersCollectionRef(), user.uid), {
        ...userProfile,
        createdAt: serverTimestamp()
    });

    // Quan trọng: Sau khi admin tạo xong, Firebase thường tự log in user đó.
    // Tùy vào logic App.tsx, bạn có thể cần xử lý lại ở đó hoặc sign out tại đây.
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
        callback(snap.docs.map(d => ({
            uid: d.id,
            ...d.data(),
            createdAt: (d.data().createdAt as Timestamp)?.toMillis() || Date.now(),
        } as AppUser)));
    });
};