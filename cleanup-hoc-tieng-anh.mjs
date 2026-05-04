/**
 * cleanup-hoc-tieng-anh.mjs
 * Xóa các bài học và session A2-KET đã add nhầm vào khóa "Hoc tieng anh".
 *
 * Tiêu chí xóa:
 *   - Session có title khớp "Unit N: ..." (14 sessions mới tạo nhầm)
 *   - Video có id khớp pattern a2XXXX (UUID deterministic của A2-KET script)
 *
 * Usage: node cleanup-hoc-tieng-anh.mjs <email> <password> [--dry-run]
 */

import { initializeApp } from 'firebase/app';
import {
    getFirestore, doc, writeBatch,
    collection, getDocs, deleteDoc,
    increment, serverTimestamp
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const app = initializeApp({
    apiKey:        'AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8',
    projectId:     'video-hub-1',
    storageBucket: 'video-hub-1.firebasestorage.app',
    appId:         '1:165232200741:web:d34258d29e98f52d7c83cc',
});
const db   = getFirestore(app);
const auth = getAuth(app);

const email    = process.argv[2];
const password = process.argv[3];
const DRY_RUN  = process.argv.includes('--dry-run');

if (!email || !password) {
    console.error('Usage: node cleanup-hoc-tieng-anh.mjs <email> <password> [--dry-run]');
    process.exit(1);
}
if (DRY_RUN) console.log('⚡ DRY RUN — không xóa thật');

let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Signed in:', userCred.user.uid);
} catch (err) {
    console.error('❌ Login failed:', err.message);
    process.exit(1);
}

const WRONG_COURSE_ID = 'WsLRz9DjZ2rxN009nwHh'; // "Hoc tieng anh"
const BASE = 'artifacts/video-hub-prod-id/public/data';
const courseRef = doc(db, `${BASE}/courses/${WRONG_COURSE_ID}`);

// ── Tìm sessions cần xóa: title khớp "Unit N: ..." ────────────────────────
const sessionsSnap = await getDocs(
    collection(db, `${BASE}/courses/${WRONG_COURSE_ID}/sessions`)
);
const sessionsToDelete = sessionsSnap.docs.filter(s =>
    /^Unit\s+\d+:/i.test(s.data().title || '')
);
console.log(`\nSessions cần xóa (${sessionsToDelete.length}):`);
for (const s of sessionsToDelete) {
    console.log(`  ${s.id} → "${s.data().title}"`);
}

// ── Tìm videos cần xóa: id khớp pattern a2-KET UUID ──────────────────────
// Pattern: a2XXXXXX... (bắt đầu bằng "a2" theo makeUUID trong add-a2ket.mjs)
const videosSnap = await getDocs(
    collection(db, `${BASE}/courses/${WRONG_COURSE_ID}/videos`)
);
const videosToDelete = videosSnap.docs.filter(v => /^a2\d{6}/.test(v.id));
console.log(`\nVideos cần xóa (${videosToDelete.length}):`);
for (const v of videosToDelete) {
    const t = v.data().title;
    const title = typeof t === 'string' ? t : (t?.en || t?.vi || '?');
    console.log(`  ${v.id} → "${title}"`);
}

if (DRY_RUN) {
    console.log('\n⚡ DRY RUN — dừng ở đây, không xóa thật.');
    console.log(`Sẽ xóa: ${sessionsToDelete.length} sessions + ${videosToDelete.length} videos`);
    process.exit(0);
}

// ── Xác nhận ──────────────────────────────────────────────────────────────
console.log(`\n⚠️  Sắp xóa vĩnh viễn:`);
console.log(`   ${sessionsToDelete.length} sessions`);
console.log(`   ${videosToDelete.length} videos`);
console.log(`   Khỏi course: "${WRONG_COURSE_ID}" (Hoc tieng anh)\n`);

// ── Xóa videos (batch 500 max) ────────────────────────────────────────────
let deletedVideos = 0;
const VIDEO_CHUNK = 490;
for (let i = 0; i < videosToDelete.length; i += VIDEO_CHUNK) {
    const chunk = videosToDelete.slice(i, i + VIDEO_CHUNK);
    const batch = writeBatch(db);
    for (const v of chunk) {
        batch.delete(doc(db, `${BASE}/courses/${WRONG_COURSE_ID}/videos/${v.id}`));
    }
    // Giảm videoCount
    batch.update(courseRef, {
        videoCount: increment(-chunk.length),
        updatedAt: serverTimestamp(),
    });
    await batch.commit();
    deletedVideos += chunk.length;
    console.log(`  ✅ Đã xóa ${deletedVideos}/${videosToDelete.length} videos...`);
}

// ── Xóa sessions ──────────────────────────────────────────────────────────
let deletedSessions = 0;
for (const s of sessionsToDelete) {
    await deleteDoc(doc(db, `${BASE}/courses/${WRONG_COURSE_ID}/sessions/${s.id}`));
    deletedSessions++;
    console.log(`  ✅ Deleted session "${s.data().title}"`);
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Done.`);
console.log(`  Videos xóa:   ${deletedVideos}`);
console.log(`  Sessions xóa: ${deletedSessions}`);
process.exit(0);
