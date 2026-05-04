/**
 * add-jlptn1.mjs
 * Seed JLPT N1 course lessons.
 * Each L##.md => type "custom" lesson with markdownContent + audios (L##-conv*.mp3).
 * All existing videos/sessions are DELETED then re-added on every run.
 *
 * Usage: node add-jlptn1.mjs <email> <password> [--dry-run]
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
if (!email || !password) { console.error('Usage: node add-jlptn1.mjs <email> <password> [--dry-run]'); process.exit(1); }
if (DRY_RUN) console.log('DRY RUN mode');

let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in:', userCred.user.uid);
} catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
}

const COURSE_ID     = 'yb2appbsOJFn1lxZ4Ulc';
const SESSION_TITLE = 'N1 Lessons';
const ADMIN_ID      = userCred.user.uid;
const BASE          = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_DIR   = 'C:/Users/LongTM4/Downloads/jlpt/lesson-n1';


const LESSONS = [
    { id: '01', uuid: 'b1000001-0001-4000-8000-000000000001', title: 'Bài L01 – ~に反して + ~に反する: Trái Với / Ngược Lại' },
    { id: '02', uuid: 'b1000001-0002-4000-8000-000000000002', title: 'Bài L02 – ~に応じて + ~いかんによって: Tùy Theo (N1)' },
    { id: '03', uuid: 'b1000001-0003-4000-8000-000000000003', title: 'Bài L03 – ~いかんにかかわらず + ~を問わず: Bất Kể (N1)' },
    { id: '04', uuid: 'b1000001-0004-4000-8000-000000000004', title: 'Bài L04 – ~に至って + ~に至っては + ~にいたるまで: Đến Tận / Đến Mức' },
    { id: '05', uuid: 'b1000001-0005-4000-8000-000000000005', title: 'Bài L05 – ~を踏まえて + ~に照らして: Dựa Vào / Chiếu Theo' },
    { id: '06', uuid: 'b1000001-0006-4000-8000-000000000006', title: 'Bài L06 – ~はともかく + ~はさておき: Gác Lại / Chưa Nói Đến' },
    { id: '07', uuid: 'b1000001-0007-4000-8000-000000000007', title: 'Bài L07 – ~はおろか + ~もさることながら: Đừng Nói / Đã Vậy Mà Còn' },
    { id: '08', uuid: 'b1000001-0008-4000-8000-000000000008', title: 'Bài L08 – ~てやまない + ~を禁じ得ない: Không Ngừng / Không Kìm Được' },
    { id: '09', uuid: 'b1000001-0009-4000-8000-000000000009', title: 'Bài L09 – ~でなくてなんだろう + ~にほかならない: Chính Là / Không Gì Ngoài' },
    { id: '10', uuid: 'b1000001-0010-4000-8000-000000000010', title: 'Bài L10 – ~ならでは + ~に越したことはない: Đặc Trưng / Tốt Nhất Là' },
    { id: '11', uuid: 'b1000001-0011-4000-8000-000000000011', title: 'Bài L11 – ~べくして + ~ことなく + ~なくして: Tất Yếu / Không Có... Thì' },
    { id: '12', uuid: 'b1000001-0012-4000-8000-000000000012', title: 'Bài L12 – ~からには + ~上は: Đã... Thì / Một Khi' },
    { id: '13', uuid: 'b1000001-0013-4000-8000-000000000013', title: 'Bài L13 – ~手前 + ~以上は: Do Trước Mặt / Vì Đã' },
    { id: '14', uuid: 'b1000001-0014-4000-8000-000000000014', title: 'Bài L14 – ~とあって + ~とあれば: Vì Là / Nếu Là' },
    { id: '15', uuid: 'b1000001-0015-4000-8000-000000000015', title: 'Bài L15 – ~としたら + ~とすれば + ~と仮定すると: Giả Sử / Nếu Như' },
    { id: '16', uuid: 'b1000001-0016-4000-8000-000000000016', title: 'Bài L16 – ~ものとして + ~ものと思われる: Coi Như / Được Cho Là' },
    { id: '17', uuid: 'b1000001-0017-4000-8000-000000000017', title: 'Bài L17 – ~ないものか + ~ないものでもない: Không Thể... Sao / Cũng Không Hẳn' },
    { id: '18', uuid: 'b1000001-0018-4000-8000-000000000018', title: 'Bài L18 – Kanji N1 Nhóm 1: Chính Trị & Hành Chính' },
    { id: '19', uuid: 'b1000001-0019-4000-8000-000000000019', title: 'Bài L19 – ~につけ + ~につけても: Mỗi Khi / Dù Thế Nào' },
    { id: '20', uuid: 'b1000001-0020-4000-8000-000000000020', title: 'Bài L20 – ~にしろ~にしろ + ~といい~といい: Dù A Hay B / Cả A Lẫn B' },
    { id: '21', uuid: 'b1000001-0021-4000-8000-000000000021', title: 'Bài L21 – ~であれ~であれ + ~なり~なり: Dù Là / Hoặc Là' },
    { id: '22', uuid: 'b1000001-0022-4000-8000-000000000022', title: 'Bài L22 – ~かと思えば + ~かと思うと: Vừa Thấy... Thì' },
    { id: '23', uuid: 'b1000001-0023-4000-8000-000000000023', title: 'Bài L23 – ~そばから: Ngay Sau Khi (Thất Vọng)' },
    { id: '24', uuid: 'b1000001-0024-4000-8000-000000000024', title: 'Bài L24 – ~ながらに: Trong Khi Vẫn Còn / Ngay Từ Khi' },
    { id: '25', uuid: 'b1000001-0025-4000-8000-000000000025', title: 'Bài L25 – ~てからというもの: Từ Sau Khi (Thay Đổi Lớn)' },
    { id: '26', uuid: 'b1000001-0026-4000-8000-000000000026', title: 'Bài L26 – ~に先立って + ~に先駆けて: Trước Khi / Đi Đầu Trong' },
    { id: '27', uuid: 'b1000001-0027-4000-8000-000000000027', title: 'Bài L27 – ~を機に + ~を皮切りに: Nhân Dịp / Mở Đầu Bằng' },
    { id: '28', uuid: 'b1000001-0028-4000-8000-000000000028', title: 'Bài L28 – Kanji N1 Nhóm 2: Kinh Tế & Tài Chính' },
    { id: '29', uuid: 'b1000001-0029-4000-8000-000000000029', title: 'Bài L29 – ~ともなると + ~ともなれば: Khi Đã Là / Một Khi Đến Mức' },
    { id: '30', uuid: 'b1000001-0030-4000-8000-000000000030', title: 'Bài L30 – ~だけに + ~だけあって: Chính Vì / Xứng Đáng Với' },
    { id: '31', uuid: 'b1000001-0031-4000-8000-000000000031', title: 'Bài L31 – ~に至っては + ~に至るまで: Đến Tận / Từ... Cho Đến' },
    { id: '32', uuid: 'b1000001-0032-4000-8000-000000000032', title: 'Bài L32 – ~ときたら + ~と言ったら: Nói Về / Nói Đến Thì' },
    { id: '33', uuid: 'b1000001-0033-4000-8000-000000000033', title: 'Bài L33 – ~ばそれまでだ + ~たところで: Thì Cũng Xong / Dù Có... Cũng' },
    { id: '34', uuid: 'b1000001-0034-4000-8000-000000000034', title: 'Bài L34 – ~が最後 + ~が早いか: Một Khi / Vừa Mới' },
    { id: '35', uuid: 'b1000001-0035-4000-8000-000000000035', title: 'Bài L35 – ~たら最後 + ~となったら: Một Khi Đã / Khi Đến Lúc' },
    { id: '36', uuid: 'b1000001-0036-4000-8000-000000000036', title: 'Bài L36 – ~ずくめ + ~づくし: Toàn Là / Đầy Ắp' },
    { id: '37', uuid: 'b1000001-0037-4000-8000-000000000037', title: 'Bài L37 – ~だらけ + ~まみれ + ~っぽい: Đầy / Bám Đầy / Có Xu Hướng' },
    { id: '38', uuid: 'b1000001-0038-4000-8000-000000000038', title: 'Bài L38 – Kanji N1 Nhóm 3: Khoa Học & Thiên Nhiên' },
    { id: '39', uuid: 'b1000001-0039-4000-8000-000000000039', title: 'Bài L39 – ~かいがある + ~がいがある: Đáng Công / Xứng Đáng Làm' },
    { id: '40', uuid: 'b1000001-0040-4000-8000-000000000040', title: 'Bài L40 – ~てしかるべきだ + ~て当然だ: Đáng Lẽ Phải / Đương Nhiên' },
    { id: '41', uuid: 'b1000001-0041-4000-8000-000000000041', title: 'Bài L41 – ~ずにはすまない + ~ないではすまない: Không Thể Không Làm (Formal)' },
    { id: '42', uuid: 'b1000001-0042-4000-8000-000000000042', title: 'Bài L42 – ~に値する + ~に足る: Xứng Đáng Với / Đáng Để' },
    { id: '43', uuid: 'b1000001-0043-4000-8000-000000000043', title: 'Bài L43 – ~にたえる + ~にたえない: Chịu Đựng Được / Không Chịu Nổi' },
    { id: '44', uuid: 'b1000001-0044-4000-8000-000000000044', title: 'Bài L44 – Tứ Tự Thành Ngữ (四字熟語) Top 60' },
    { id: '45', uuid: 'b1000001-0045-4000-8000-000000000045', title: 'Bài L45 – Kanji N1 Nhóm 4: Y Tế & Cơ Thể Người' },
    { id: '46', uuid: 'b1000001-0046-4000-8000-000000000046', title: 'Bài L46 – ~あっての: Nhờ Có Mới... / Không Có Thì Không' },
    { id: '47', uuid: 'b1000001-0047-4000-8000-000000000047', title: 'Bài L47 – ~もさることながら: Đã Vậy Mà Còn / Không Chỉ' },
    { id: '48', uuid: 'b1000001-0048-4000-8000-000000000048', title: 'Bài L48 – ~といえども + ~とはいえ: Dù Là / Tuy Vậy' },
    { id: '49', uuid: 'b1000001-0049-4000-8000-000000000049', title: 'Bài L49 – ~を余儀なくされる: Buộc Phải Làm' },
    { id: '50', uuid: 'b1000001-0050-4000-8000-000000000050', title: 'Bài L50 – ~ようによっては: Tùy Cách / Tùy Theo Cách Làm' },
    { id: '51', uuid: 'b1000001-0051-4000-8000-000000000051', title: 'Bài L51 – ~に照らす + ~に即して: Chiếu Theo / Phù Hợp Với' },
    { id: '52', uuid: 'b1000001-0052-4000-8000-000000000052', title: 'Bài L52 – Kanji N1 Nhóm 5: Lịch Sử & Văn Hóa' },
    { id: '53', uuid: 'b1000001-0053-4000-8000-000000000053', title: 'Bài L53 – Từ Vựng N1 Nhóm 1: Phạm Trù Xã Hội & Chính Sách' },
    { id: '54', uuid: 'b1000001-0054-4000-8000-000000000054', title: 'Bài L54 – Từ Vựng N1 Nhóm 2: Triết Học & Tư Duy' },
    { id: '55', uuid: 'b1000001-0055-4000-8000-000000000055', title: 'Bài L55 – Chiến Thuật Đọc Hiểu N1: Văn Bản Trừu Tượng' },
    { id: '56', uuid: 'b1000001-0056-4000-8000-000000000056', title: 'Bài L56 – Chiến Thuật Nghe N1: Tốc Độ + Ẩn Ý' },
    { id: '57', uuid: 'b1000001-0057-4000-8000-000000000057', title: 'Bài L57 – MOCK TEST 1: Đề Thi N1 Đầy Đủ' },
    { id: '58', uuid: 'b1000001-0058-4000-8000-000000000058', title: 'Bài L58 – Review Mock 1 + Phân Tích Điểm Yếu' },
    { id: '59', uuid: 'b1000001-0059-4000-8000-000000000059', title: 'Bài L59 – MOCK TEST 2: Đề Thi N1 Lần 2' },
    { id: '60', uuid: 'b1000001-0060-4000-8000-000000000060', title: 'Bài L60 – Review Mock 2 + Luyện Tập Nghe Nâng Cao' },
    { id: '61', uuid: 'b1000001-0061-4000-8000-000000000061', title: 'Bài L61 – Final Master Review: Ôn Tổng Lực N1 + Chiến Lược Thi' },
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
