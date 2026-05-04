/**
 * add-jlptn4.mjs
 * Seed JLPT N4 course lessons.
 * Each L##.md => type "custom" lesson with markdownContent + audios (L##-conv*.mp3).
 * All existing videos/sessions are DELETED then re-added on every run.
 *
 * Usage: node add-jlptn4.mjs <email> <password> [--dry-run]
 */
import { initializeApp }        from 'firebase/app';
import {
    getFirestore, doc, writeBatch,
    collection, getDocs, setDoc,
    increment, serverTimestamp
}                                from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync, existsSync, readdirSync } from 'fs';

const app = initializeApp({
    apiKey:        'AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8',
    projectId:     'video-hub-1',
    storageBucket: 'video-hub-1.firebasestorage.app',
    appId:         '1:165232200741:web:d34258d29e98f52d7c83cc',
});
const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

const email    = process.argv[2];
const password = process.argv[3];
const DRY_RUN  = process.argv.includes('--dry-run');
if (!email || !password) { console.error('Usage: node add-jlptn4.mjs <email> <password> [--dry-run]'); process.exit(1); }
if (DRY_RUN) console.log('DRY RUN mode');

let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in:', userCred.user.uid);
} catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
}

const COURSE_ID     = 'ouBXr5GlgqVKYPFWTFnz';
const SESSION_TITLE = 'N4 Lessons';
const ADMIN_ID      = userCred.user.uid;
const BASE          = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_DIR   = 'C:/Users/LongTM4/Downloads/jlpt/lesson-n4';


const LESSONS = [
    { id: '01', uuid: 'b4000001-0001-4000-8000-000000000001', title: 'Bài L01 – Casual form (普通形) – Động từ' },
    { id: '02', uuid: 'b4000001-0002-4000-8000-000000000002', title: 'Bài L02 – Casual form – Tính từ + Danh từ' },
    { id: '03', uuid: 'b4000001-0003-4000-8000-000000000003', title: 'Bài L03 – 〜と思う / 〜と言う' },
    { id: '04', uuid: 'b4000001-0004-4000-8000-000000000004', title: 'Bài L04 – 〜なければならない / 〜なくてもいい' },
    { id: '05', uuid: 'b4000001-0005-4000-8000-000000000005', title: 'Bài L05 – 〜てもいい / 〜てはいけない' },
    { id: '06', uuid: 'b4000001-0006-4000-8000-000000000006', title: 'Bài L06 – 〜ている (trạng thái kéo dài)' },
    { id: '07', uuid: 'b4000001-0007-4000-8000-000000000007', title: 'Bài L07 – Kanji nhóm 1: 入出立座待歩走電話便' },
    { id: '08', uuid: 'b4000001-0008-4000-8000-000000000008', title: 'Bài L08 – 〜たり〜たりする' },
    { id: '09', uuid: 'b4000001-0009-4000-8000-000000000009', title: 'Bài L09 – 〜ながら – Vừa A vừa B' },
    { id: '10', uuid: 'b4000001-0010-4000-8000-000000000010', title: 'Bài L10 – Potential form (可能形) – Thể khả năng' },
    { id: '11', uuid: 'b4000001-0011-4000-8000-000000000011', title: 'Bài L11 – 〜ようになる / 〜ことができる' },
    { id: '12', uuid: 'b4000001-0012-4000-8000-000000000012', title: 'Bài L12 – Volitional 〜う/〜よう + 〜ようと思う' },
    { id: '13', uuid: 'b4000001-0013-4000-8000-000000000013', title: 'Bài L13 – Điều kiện 〜たら' },
    { id: '14', uuid: 'b4000001-0014-4000-8000-000000000014', title: 'Bài L14 – Điều kiện 〜と + 〜ば' },
    { id: '15', uuid: 'b4000001-0015-4000-8000-000000000015', title: 'Bài L15 – Điều kiện 〜なら + Tổng kết 4 dạng điều kiện' },
    { id: '16', uuid: 'b4000001-0016-4000-8000-000000000016', title: 'Bài L16 – Kanji nhóm 2: 朝昼夜午前後毎週月年' },
    { id: '17', uuid: 'b4000001-0017-4000-8000-000000000017', title: 'Bài L17 – 〜そう: Trông có vẻ + Nghe nói' },
    { id: '18', uuid: 'b4000001-0018-4000-8000-000000000018', title: 'Bài L18 – 〜ようだ / 〜みたい: Suy đoán dựa trên chứng cớ' },
    { id: '19', uuid: 'b4000001-0019-4000-8000-000000000019', title: 'Bài L19 – Cho/Nhận: あげる・もらう・くれる' },
    { id: '20', uuid: 'b4000001-0020-4000-8000-000000000020', title: 'Bài L20 – 〜てあげる / 〜てもらう / 〜てくれる: Hành động cho/nhận' },
    { id: '21', uuid: 'b4000001-0021-4000-8000-000000000021', title: 'Bài L21 – 〜ても: Dù... vẫn...' },
    { id: '22', uuid: 'b4000001-0022-4000-8000-000000000022', title: 'Bài L22 – Kanji nhóm 3: 駅電車店買売働仕事休' },
    { id: '23', uuid: 'b4000001-0023-4000-8000-000000000023', title: 'Bài L23 – 〜つもり / 〜予定: Dự định và Kế hoạch' },
    { id: '24', uuid: 'b4000001-0024-4000-8000-000000000024', title: 'Bài L24 – Bị động 〜れる / 〜られる (受身形)' },
    { id: '25', uuid: 'b4000001-0025-4000-8000-000000000025', title: 'Bài L25 – Sai khiến 〜せる / 〜させる (使役形)' },
    { id: '26', uuid: 'b4000001-0026-4000-8000-000000000026', title: 'Bài L26 – Keigo cơ bản: お〜になる / お〜する (敬語)' },
    { id: '27', uuid: 'b4000001-0027-4000-8000-000000000027', title: 'Bài L27 – 〜ので / 〜のに / 〜ところだ' },
    { id: '28', uuid: 'b4000001-0028-4000-8000-000000000028', title: 'Bài L28 – Kanji nhóm cuối: 早晩重軽強弱多少新古' },
    { id: '29', uuid: 'b4000001-0029-4000-8000-000000000029', title: 'Bài L29 – MOCK TEST 1 + Ôn Tổng (L01–L28)' },
    { id: '30', uuid: 'b4000001-0030-4000-8000-000000000030', title: 'Bài L30 – Sửa Mock 1 + Chiến Thuật Đọc/Nghe JLPT N4' },
    { id: '31', uuid: 'b4000001-0031-4000-8000-000000000031', title: 'Bài L31 – MOCK TEST 2' },
    { id: '32', uuid: 'b4000001-0032-4000-8000-000000000032', title: 'Bài L32 – Final Review: 50 Ngữ Pháp + 100 Từ Vựng Khó N4' },
];


// ── Helpers ────────────────────────────────────────────────────────────────
async function deleteDocs(snapshotDocs) {
    for (let i = 0; i < snapshotDocs.length; i += 490) {
        const chunk = snapshotDocs.slice(i, i + 490);
        const b = writeBatch(db);
        chunk.forEach(d => b.delete(d.ref));
        await b.commit();
    }
}

async function uploadAudio(localPath, fileName, lessonUUID, index) {
    const data        = readFileSync(localPath);
    const storagePath = `artifacts/video-hub-prod-id/assets/${COURSE_ID}/${lessonUUID}/${fileName}`;
    const storageRef  = ref(storage, storagePath);
    await uploadBytes(storageRef, data, { contentType: 'audio/mpeg' });
    const url = await getDownloadURL(storageRef);
    return { id: `${lessonUUID}-a${String(index).padStart(2,'0')}`, name: fileName, url };
}

// ── Delete all existing videos + sessions ──────────────────────────────────
const courseRef   = doc(db, `${BASE}/courses/${COURSE_ID}`);
const sessionsCol = collection(db, `${BASE}/courses/${COURSE_ID}/sessions`);

if (!DRY_RUN) {
    console.log('\nDeleting old data...');
    const oldVideos   = await getDocs(collection(db, `${BASE}/courses/${COURSE_ID}/videos`));
    const oldSessions = await getDocs(sessionsCol);
    await deleteDocs(oldVideos.docs);   console.log(`   Deleted ${oldVideos.size} videos`);
    await deleteDocs(oldSessions.docs); console.log(`   Deleted ${oldSessions.size} sessions`);
    const rb = writeBatch(db);
    rb.update(courseRef, { videoCount: 0, updatedAt: serverTimestamp() });
    await rb.commit();
}

// ── Create session ─────────────────────────────────────────────────────────
let SESSION_ID;
if (DRY_RUN) {
    SESSION_ID = 'DRY_SESSION';
    console.log('\n[DRY] Would create session:', SESSION_TITLE);
} else {
    const sessionDocRef = doc(sessionsCol);
    await setDoc(sessionDocRef, {
        courseId: COURSE_ID, title: SESSION_TITLE, orderIndex: 1,
        videoCount: 0, parentId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    SESSION_ID = sessionDocRef.id;
    console.log('\nCreated session:', SESSION_ID);
}
const sessionRef = doc(db, `${BASE}/courses/${COURSE_ID}/sessions/${SESSION_ID}`);

// ── Process lessons ────────────────────────────────────────────────────────
const allFiles = existsSync(LESSONS_DIR) ? readdirSync(LESSONS_DIR).sort() : [];
let totalAdded = 0, totalSkipped = 0, totalFailed = 0;

for (const lesson of LESSONS) {
    const mdFile   = `L${lesson.id}.md`;
    const mdPath   = `${LESSONS_DIR}/${mdFile}`;
    const mp3Files = allFiles.filter(f => f.startsWith(`L${lesson.id}-`) && f.endsWith('.mp3')).sort();

    if (!existsSync(mdPath)) { console.log(`  MISS  ${mdFile}`); totalSkipped++; continue; }

    const mdContent = readFileSync(mdPath, 'utf8');
    console.log(`  ${mdFile}${mp3Files.length ? ` + ${mp3Files.length} audio` : ''}`);

    if (DRY_RUN) { mp3Files.forEach(f => console.log(`       -> ${f}`)); totalAdded++; continue; }

    const audioItems = [];
    for (let i = 0; i < mp3Files.length; i++) {
        try {
            audioItems.push(await uploadAudio(`${LESSONS_DIR}/${mp3Files[i]}`, mp3Files[i], lesson.uuid, i + 1));
            console.log(`       OK ${mp3Files[i]}`);
        } catch (err) { console.error(`       FAIL upload ${mp3Files[i]}:`, err.message); }
    }

    const blockData = [{
        id: `${lesson.uuid}-b01`, description: '', markdownContent: mdContent,
        audios: audioItems, videos: [], images: [], vocabularyGroups: [], quizzes: [], grammars: [],
    }];

    const batch = writeBatch(db);
    batch.set(doc(db, `${BASE}/courses/${COURSE_ID}/videos/${lesson.uuid}`), {
        courseId: COURSE_ID, sessionId: SESSION_ID, title: { vi: lesson.title },
        adminId: ADMIN_ID, type: 'custom', blockData, createdAt: serverTimestamp(),
    });
    batch.update(courseRef,  { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });

    try { await batch.commit(); console.log(`       saved "${lesson.title}"`); totalAdded++; }
    catch (err) { console.error(`       FAIL "${lesson.title}":`, err.message); totalFailed++; }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Done${DRY_RUN ? ' (DRY RUN)' : ''}.`);
console.log(`  Added: ${totalAdded}  Skipped: ${totalSkipped}  Failed: ${totalFailed}`);
process.exit(0);
