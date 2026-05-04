/**
 * add-jlptn5.mjs
 * Seed JLPT N5 course lessons vào Firebase.
 * Mỗi file L##.md = 1 bài học type "custom", có markdownContent + audios (L##-conv*.mp3).
 * Toàn bộ bài cũ sẽ bị XÓA rồi thêm lại từ đầu mỗi lần chạy.
 *
 * Usage: node add-jlptn5.mjs <email> <password> [--dry-run]
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

// ── Firebase config ────────────────────────────────────────────────────────
const app = initializeApp({
    apiKey:        'AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8',
    projectId:     'video-hub-1',
    storageBucket: 'video-hub-1.firebasestorage.app',
    appId:         '1:165232200741:web:d34258d29e98f52d7c83cc',
});
const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

// ── Args ───────────────────────────────────────────────────────────────────
const email    = process.argv[2];
const password = process.argv[3];
const DRY_RUN  = process.argv.includes('--dry-run');

if (!email || !password) {
    console.error('Usage: node add-jlptn5.mjs <email> <password> [--dry-run]');
    process.exit(1);
}
if (DRY_RUN) console.log('⚡ DRY RUN mode — không ghi dữ liệu');

// ── Auth ───────────────────────────────────────────────────────────────────
let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Signed in:', userCred.user.uid);
} catch (err) {
    console.error('❌ Login failed:', err.message);
    process.exit(1);
}

// ── Constants ──────────────────────────────────────────────────────────────
const COURSE_ID    = 'zt0Hg7jha2ttQYXOxoqW'; // JLPT N5
const SESSION_TITLE = 'N5 Lessons';
const ADMIN_ID     = userCred.user.uid;
const BASE         = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_DIR  = 'C:/Users/LongTM4/Downloads/jlpt/lesson-n5';

const LESSONS = [
    { id: '01', uuid: 'a1b2c3d4-0001-4000-8000-000000000001', title: 'Bài L01 – Hiragana hàng あ～な + 8 Lời Chào CORE' },
    { id: '02', uuid: 'a1b2c3d4-0002-4000-8000-000000000002', title: 'Bài L02 – Hiragana hàng は～ん + 10 Đại Từ/Chỉ Định' },
    { id: '03', uuid: 'a1b2c3d4-0003-4000-8000-000000000003', title: 'Bài L03 – Katakana Cơ Bản + 12 Từ Ngoại Lai' },
    { id: '04', uuid: 'a1b2c3d4-0004-4000-8000-000000000004', title: 'Bài L04 – AはBです：Câu Giới Thiệu CORE Nhất' },
    { id: '05', uuid: 'a1b2c3d4-0005-4000-8000-000000000005', title: 'Bài L05 – じゃありませんでした + Ngày Trong Tuần' },
    { id: '06', uuid: 'a1b2c3d4-0006-4000-8000-000000000006', title: 'Bài L06 – Số Đếm 1-100 + これ・それ・あれ + は～です' },
    { id: '07', uuid: 'a1b2c3d4-0007-4000-8000-000000000007', title: 'Bài L07 – Kanji Nhóm 1: 一二三四五六七八九十・日月' },
    { id: '08', uuid: 'a1b2c3d4-0008-4000-8000-000000000008', title: 'Bài L08 – Particle は・の + Gia Đình' },
    { id: '09', uuid: 'a1b2c3d4-0009-4000-8000-000000000009', title: 'Bài L09 – Ôn Tập Phase 1 + Mini Test' },
    { id: '10', uuid: 'a1b2c3d4-0010-4000-8000-000000000010', title: 'Bài L10 – Động Từ ます-form + Particle を' },
    { id: '11', uuid: 'a1b2c3d4-0011-4000-8000-000000000011', title: 'Bài L11 – Particle に・で・へ + Địa Điểm' },
    { id: '12', uuid: 'a1b2c3d4-0012-4000-8000-000000000012', title: 'Bài L12 – Tính Từ い và な + Mô Tả' },
    { id: '13', uuid: 'a1b2c3d4-0013-4000-8000-000000000013', title: 'Bài L13 – あります・います + Vị Trí' },
    { id: '14', uuid: 'a1b2c3d4-0014-4000-8000-000000000014', title: 'Bài L14 – V-て form + ~てください + ~ています' },
    { id: '15', uuid: 'a1b2c3d4-0015-4000-8000-000000000015', title: 'Bài L15 – ~たいです + ~ませんか・~ましょう' },
    { id: '16', uuid: 'a1b2c3d4-0016-4000-8000-000000000016', title: 'Bài L16 – Kanji Nhóm 2: 人大小山川田上下中' },
    { id: '17', uuid: 'a1b2c3d4-0017-4000-8000-000000000017', title: 'Bài L17 – So Sánh: AはBより～ + AとBとどちらが～' },
    { id: '18', uuid: 'a1b2c3d4-0018-4000-8000-000000000018', title: 'Bài L18 – Counter Cơ Bản: 個・枚・人・本・台・杯' },
    { id: '19', uuid: 'a1b2c3d4-0019-4000-8000-000000000019', title: 'Bài L19 – V-ない form + ~ないでください' },
    { id: '20', uuid: 'a1b2c3d4-0020-4000-8000-000000000020', title: 'Bài L20 – V-た form + ~たことがあります' },
    { id: '21', uuid: 'a1b2c3d4-0021-4000-8000-000000000021', title: 'Bài L21 – ~から (Lý do) + ~が・けど (Nhưng)' },
    { id: '22', uuid: 'a1b2c3d4-0022-4000-8000-000000000022', title: 'Bài L22 – Kanji Nhóm 3: 行来見聞食飲読書話' },
    { id: '23', uuid: 'a1b2c3d4-0023-4000-8000-000000000023', title: 'Bài L23 – ~が好き・~が上手・~が分かる' },
    { id: '24', uuid: 'a1b2c3d4-0024-4000-8000-000000000024', title: 'Bài L24 – Thời Tiết + Mùa + ~なります' },
    { id: '25', uuid: 'a1b2c3d4-0025-4000-8000-000000000025', title: 'Bài L25 – Ôn Tập Tổng: 40 Ngữ Pháp CORE N5' },
    { id: '26', uuid: 'a1b2c3d4-0026-4000-8000-000000000026', title: 'Bài L26 – Kanji Nhóm Cuối: 男女子父母先生学校' },
    { id: '27', uuid: 'a1b2c3d4-0027-4000-8000-000000000027', title: 'Bài L27 – MOCK TEST 1: Đề Thi JLPT N5 Mô Phỏng' },
    { id: '28', uuid: 'a1b2c3d4-0028-4000-8000-000000000028', title: 'Bài L28 – Sửa Mock Test 1 + Chiến Thuật Đọc Hiểu' },
    { id: '29', uuid: 'a1b2c3d4-0029-4000-8000-000000000029', title: 'Bài L29 – MOCK TEST 2: Đề Thi JLPT N5 Mô Phỏng (Bộ 2)' },
    { id: '30', uuid: 'a1b2c3d4-0030-4000-8000-000000000030', title: 'Bài L30 – Sửa Mock 2 + Chiến Thuật Nghe + Final Review' },
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
    return {
        id:   `${lessonUUID}-a${String(index).padStart(2, '0')}`,
        name: fileName,
        url,
    };
}

// ── Delete all existing videos + sessions ──────────────────────────────────
const courseRef   = doc(db, `${BASE}/courses/${COURSE_ID}`);
const sessionsCol = collection(db, `${BASE}/courses/${COURSE_ID}/sessions`);

if (!DRY_RUN) {
    console.log('\n🗑️  Xóa dữ liệu cũ...');
    const oldVideos   = await getDocs(collection(db, `${BASE}/courses/${COURSE_ID}/videos`));
    const oldSessions = await getDocs(sessionsCol);
    await deleteDocs(oldVideos.docs);
    console.log(`   Deleted ${oldVideos.size} videos`);
    await deleteDocs(oldSessions.docs);
    console.log(`   Deleted ${oldSessions.size} sessions`);
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
        courseId:   COURSE_ID,
        title:      SESSION_TITLE,
        orderIndex: 1,
        videoCount: 0,
        parentId:   null,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
    });
    SESSION_ID = sessionDocRef.id;
    console.log('\n✅ Created session:', SESSION_ID);
}
const sessionRef = doc(db, `${BASE}/courses/${COURSE_ID}/sessions/${SESSION_ID}`);

// ── Process lessons ────────────────────────────────────────────────────────
const allFiles    = existsSync(LESSONS_DIR) ? readdirSync(LESSONS_DIR).sort() : [];
let totalAdded = 0, totalSkipped = 0, totalFailed = 0;

for (const lesson of LESSONS) {
    const mdFile   = `L${lesson.id}.md`;
    const mdPath   = `${LESSONS_DIR}/${mdFile}`;
    const mp3Files = allFiles.filter(f => f.startsWith(`L${lesson.id}-`) && f.endsWith('.mp3')).sort();

    if (!existsSync(mdPath)) {
        console.log(`  MISS  ${mdFile}`);
        totalSkipped++;
        continue;
    }

    const mdContent = readFileSync(mdPath, 'utf8');
    console.log(`  ⬆️   ${mdFile}${mp3Files.length ? ` + ${mp3Files.length} audio` : ''}`);

    if (DRY_RUN) {
        mp3Files.forEach(f => console.log(`       → audio: ${f}`));
        totalAdded++;
        continue;
    }

    // Upload audio files
    const audioItems = [];
    for (let i = 0; i < mp3Files.length; i++) {
        try {
            const item = await uploadAudio(`${LESSONS_DIR}/${mp3Files[i]}`, mp3Files[i], lesson.uuid, i + 1);
            audioItems.push(item);
            console.log(`       ✅ ${mp3Files[i]}`);
        } catch (err) {
            console.error(`       ❌ FAIL upload ${mp3Files[i]}:`, err.message);
        }
    }

    // Write Firestore
    const blockData = [{
        id:               `${lesson.uuid}-b01`,
        description:      '',
        markdownContent:  mdContent,
        audios:           audioItems,
        videos:           [],
        images:           [],
        vocabularyGroups: [],
        quizzes:          [],
        grammars:         [],
    }];

    const batch = writeBatch(db);
    batch.set(doc(db, `${BASE}/courses/${COURSE_ID}/videos/${lesson.uuid}`), {
        courseId:  COURSE_ID,
        sessionId: SESSION_ID,
        title:     { vi: lesson.title },
        adminId:   ADMIN_ID,
        type:      'custom',
        blockData,
        createdAt: serverTimestamp(),
    });
    batch.update(courseRef,  { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });

    try {
        await batch.commit();
        console.log(`       ✅ saved "${lesson.title}"`);
        totalAdded++;
    } catch (err) {
        console.error(`       ❌ FAIL "${lesson.title}":`, err.message);
        totalFailed++;
    }
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Done${DRY_RUN ? ' (DRY RUN)' : ''}.`);
console.log(`  Added:   ${totalAdded}`);
console.log(`  Skipped: ${totalSkipped}`);
console.log(`  Failed:  ${totalFailed}`);
process.exit(0);
