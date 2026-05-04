import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs, increment, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync, existsSync } from 'fs';

const app = initializeApp({
    apiKey: "AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8",
    projectId: "video-hub-1",
    storageBucket: "video-hub-1.firebasestorage.app",
    appId: "1:165232200741:web:d34258d29e98f52d7c83cc"
});
const db   = getFirestore(app);
const auth = getAuth(app);

const email    = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage: node add-l03.mjs <email> <password>');
    process.exit(1);
}

console.log('Signing in as', email + '...');
let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in:', userCred.user.uid);
} catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
}

const COURSE_ID  = 'zt0Hg7jha2ttQYXOxoqW';
const SESSION_ID = 'dHNLAmGCpuw8e4f9ma7H';
const ADMIN_ID   = userCred.user.uid;
const BASE       = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_DIR = 'C:/Users/LongTM4/Downloads/jlpt/lesson-n5';

const LESSONS = [
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

// Fetch existing video IDs to skip duplicates
const existingSnap = await getDocs(collection(db, BASE + '/courses/' + COURSE_ID + '/videos'));
const existingIds  = new Set(existingSnap.docs.map(d => d.id));
const existingTitles = new Set(existingSnap.docs.map(d => {
    const t = d.data().title;
    return typeof t === 'string' ? t : (t?.vi || '');
}));

console.log('\nExisting lessons:', existingSnap.size);

const courseRef  = doc(db, BASE + '/courses/' + COURSE_ID);
const sessionRef = doc(db, BASE + '/courses/' + COURSE_ID + '/sessions/' + SESSION_ID);

let added = 0, skipped = 0;

for (const lesson of LESSONS) {
    if (existingIds.has(lesson.uuid) || existingTitles.has(lesson.title)) {
        console.log('  SKIP  L' + lesson.id + ' (already exists)');
        skipped++;
        continue;
    }

    const filePath = LESSONS_DIR + '/L' + lesson.id + '.md';
    if (!existsSync(filePath)) {
        console.log('  MISS  L' + lesson.id + ' (file not found: ' + filePath + ')');
        skipped++;
        continue;
    }

    const content = readFileSync(filePath, 'utf8');
    const videoRef = doc(db, BASE + '/courses/' + COURSE_ID + '/videos/' + lesson.uuid);

    const batch = writeBatch(db);
    batch.set(videoRef, {
        courseId: COURSE_ID,
        sessionId: SESSION_ID,
        title: { vi: lesson.title },
        adminId: ADMIN_ID,
        createdAt: serverTimestamp(),
        type: 'text',
        content,
    });
    batch.update(courseRef,  { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });

    try {
        await batch.commit();
        console.log('  OK    L' + lesson.id + ' – ' + lesson.title);
        added++;
    } catch (err) {
        console.error('  FAIL  L' + lesson.id + ':', err.message);
    }
}

console.log('\nDone. Added: ' + added + '  Skipped: ' + skipped);
process.exit(0);