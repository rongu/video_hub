import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
    apiKey: 'AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8',
    projectId: 'video-hub-1',
    storageBucket: 'video-hub-1.firebasestorage.app',
    appId: '1:165232200741:web:d34258d29e98f52d7c83cc',
});
const db = getFirestore(app);
const BASE = 'artifacts/video-hub-prod-id/public/data';

const snap = await getDocs(collection(db, `${BASE}/courses`));
console.log(`\nAll courses (${snap.size}):\n`);
for (const d of snap.docs) {
    const data = d.data();
    const title = typeof data.title === 'string' ? data.title : (data.title?.vi || data.title?.en || JSON.stringify(data.title));
    console.log(`  ${d.id}`);
    console.log(`    title:      ${title}`);
    console.log(`    videoCount: ${data.videoCount ?? 0}`);
    console.log(`    level:      ${data.level ?? ''}`);
    console.log();
}
process.exit(0);
