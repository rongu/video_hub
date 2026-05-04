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
const COURSE_ID = 'Q7guDyoYogpQhJmFhDrp'; // A2-KET

console.log(`\nChecking COURSE_ID: ${COURSE_ID}`);
console.log(`Path: ${BASE}/courses/${COURSE_ID}`);

const sessionsSnap = await getDocs(collection(db, `${BASE}/courses/${COURSE_ID}/sessions`));
console.log(`\nSessions (${sessionsSnap.size}):`);
const sessionIds = new Set();
for (const s of sessionsSnap.docs) {
    sessionIds.add(s.id);
    console.log(`  ${s.id} → "${s.data().title}" | videoCount=${s.data().videoCount ?? 0}`);
}

const videosSnap = await getDocs(collection(db, `${BASE}/courses/${COURSE_ID}/videos`));
console.log(`\nVideos total: ${videosSnap.size}`);

const bySession = {};
let orphaned = 0;
for (const v of videosSnap.docs) {
    const sid = v.data().sessionId || 'NO_SESSION_ID';
    if (!bySession[sid]) bySession[sid] = [];
    const t = v.data().title;
    bySession[sid].push(typeof t === 'string' ? t : (t?.en || t?.vi || '?'));
    if (!sessionIds.has(sid)) orphaned++;
}

console.log('\nVideos grouped by sessionId:');
for (const [sid, titles] of Object.entries(bySession)) {
    const exists = sessionIds.has(sid) ? '✅' : '❌ ORPHAN (session missing)';
    console.log(`  ${sid}: ${titles.length} videos ${exists}`);
    titles.slice(0, 3).forEach(t => console.log(`    - ${t}`));
    if (titles.length > 3) console.log(`    ... +${titles.length - 3} more`);
}

if (orphaned > 0) {
    console.log(`\n⚠️  ${orphaned} videos có sessionId trỏ đến session không tồn tại → không hiển thị trong UI!`);
} else if (videosSnap.size === 0) {
    console.log('\n⚠️  Không có video nào trong course này!');
} else {
    console.log('\n✅ Tất cả videos đều có session hợp lệ.');
}

process.exit(0);
