import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs, increment, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync, existsSync } from 'fs';
const app = initializeApp({ apiKey: "AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8", projectId: "video-hub-1", storageBucket: "video-hub-1.firebasestorage.app", appId: "1:165232200741:web:d34258d29e98f52d7c83cc" });
const db = getFirestore(app); const auth = getAuth(app);
const email = process.argv[2]; const password = process.argv[3];
if (!email || !password) { console.error('Usage: node add-jlptn2.mjs <email> <password>'); process.exit(1); }
let userCred;
try { userCred = await signInWithEmailAndPassword(auth, email, password); console.log('Signed in:', userCred.user.uid); }
catch (err) { console.error('Login failed:', err.message); process.exit(1); }
const COURSE_ID = 'FZxv2bsfDE0Eq6JpPEE3'; const SESSION_TITLE = 'N2 Lessons';
const ADMIN_ID = userCred.user.uid; const BASE = 'artifacts/video-hub-prod-id/public/data'; const LESSONS_DIR = 'C:/Users/LongTM4/Downloads/jlpt/lesson-n2';
const LESSONS = [
    { id: '01', uuid: 'b2000001-0001-4000-8000-000000000001', title: 'Bài L01 – ~にもかかわらず: "Mặc Dù" Cấp Độ Formal' },
    { id: '02', uuid: 'b2000001-0002-4000-8000-000000000002', title: 'Bài L02 – ~ものの: "Mặc Dù" Với Sắc Thái Kết Quả Chưa Hoàn Chỉnh' },
    { id: '03', uuid: 'b2000001-0003-4000-8000-000000000003', title: 'Bài L03 – ~ながら (逆接) + ~くせに: Hai Cách "Mặc Dù" Trong Hội Thoại' },
    { id: '04', uuid: 'b2000001-0004-4000-8000-000000000004', title: 'Bài L04 – ~とはいえ: Tuy Vậy / Tuy Là Vậy + Tổng Kết 5 Cách "Mặc Dù"' },
    { id: '05', uuid: 'b2000001-0005-4000-8000-000000000005', title: 'Bài L05 – ~にしたがって + ~とともに: Cùng Với / Theo (Song Hành)' },
    { id: '06', uuid: 'b2000001-0006-4000-8000-000000000006', title: 'Bài L06 – ~につれ(て) + ~に伴って: Theo / Kèm Theo (Đồng Hành)' },
    { id: '07', uuid: 'b2000001-0007-4000-8000-000000000007', title: 'Bài L07 – ~ばかりか + ~ばかりでなく + ~のみならず: Không Chỉ... Mà Còn...' },
    { id: '08', uuid: 'b2000001-0008-4000-8000-000000000008', title: 'Bài L08 – ~どころか + ~どころではない: Đừng Nói Đến / Không Phải Lúc' },
    { id: '09', uuid: 'b2000001-0009-4000-8000-000000000009', title: 'Bài L09 – ~まい + ~まいか: Quyết Tâm Không / Phân Vân Có Không' },
    { id: '10', uuid: 'b2000001-0010-4000-8000-000000000010', title: 'Bài L10 – ~ずに + ~ないで: Không Làm X Mà... (Phân Biệt Tinh Tế)' },
    { id: '11', uuid: 'b2000001-0011-4000-8000-000000000011', title: 'Bài L11 – ~ざるを得ない + ~にすぎない + ~に限らず: Phong Cách Trang Trọng N2' },
    { id: '12', uuid: 'b2000001-0012-4000-8000-000000000012', title: 'Bài L12 – ~に限って + ~に限る: Chỉ Trong Trường Hợp / Không Gì Bằng' },
    { id: '13', uuid: 'b2000001-0013-4000-8000-000000000013', title: 'Bài L13 – ~わけだ + ~わけがない: Đương Nhiên / Không Thể Nào' },
    { id: '14', uuid: 'b2000001-0014-4000-8000-000000000014', title: 'Bài L14 – ~わけではない + ~わけにはいかない: Không Hẳn Là / Không Thể Được' },
    { id: '15', uuid: 'b2000001-0015-4000-8000-000000000015', title: 'Bài L15 – ~ずにはいられない + ~ないではいられない: Không Thể Không Làm' },
    { id: '16', uuid: 'b2000001-0016-4000-8000-000000000016', title: 'Bài L16 – ~ことだ + ~ことになっている: Nên Làm / Theo Quy Định' },
    { id: '17', uuid: 'b2000001-0017-4000-8000-000000000017', title: 'Bài L17 – ~ことだから + ~ものだ + ~ものではない: Vì Bản Tính / Lẽ Thường' },
    { id: '18', uuid: 'b2000001-0018-4000-8000-000000000018', title: 'Bài L18 – Ôn Tập Kanji Nhóm 1: Chính Trị, Kinh Tế, Xã Hội' },
    { id: '19', uuid: 'b2000001-0019-4000-8000-000000000019', title: 'Bài L19 – ~たところ + ~たとたん: Ngay Khi / Vừa Mới' },
    { id: '20', uuid: 'b2000001-0020-4000-8000-000000000020', title: 'Bài L20 – ~か~ないかのうちに + ~次第: Vừa Mới / Ngay Khi' },
    { id: '21', uuid: 'b2000001-0021-4000-8000-000000000021', title: 'Bài L21 – ~上で + ~に基づいて: Sau Khi / Dựa Trên' },
    { id: '22', uuid: 'b2000001-0022-4000-8000-000000000022', title: 'Bài L22 – ~に応じて + ~に沿って: Tùy Theo / Theo Sát' },
    { id: '23', uuid: 'b2000001-0023-4000-8000-000000000023', title: 'Bài L23 – ~を通じて + ~を通して: Thông Qua' },
    { id: '24', uuid: 'b2000001-0024-4000-8000-000000000024', title: 'Bài L24 – ~を契機に + ~をきっかけに: Nhân Cơ Hội / Từ Đó Mà' },
    { id: '25', uuid: 'b2000001-0025-4000-8000-000000000025', title: 'Bài L25 – ~を中心に + ~を込めて: Tập Trung Vào / Gửi Gắm Vào' },
    { id: '26', uuid: 'b2000001-0026-4000-8000-000000000026', title: 'Bài L26 – ~を問わず + ~に関わらず: Bất Kể / Không Phân Biệt' },
    { id: '27', uuid: 'b2000001-0027-4000-8000-000000000027', title: 'Bài L27 – ~一方 + ~一方で: Một Mặt / Trong Khi Đó' },
    { id: '28', uuid: 'b2000001-0028-4000-8000-000000000028', title: 'Bài L28 – ~反面 + ~半面: Mặt Trái / Ngược Lại' },
    { id: '29', uuid: 'b2000001-0029-4000-8000-000000000029', title: 'Bài L29 – Kanji Nhóm 2: Khoa Học, Y Tế & Công Nghệ' },
    { id: '30', uuid: 'b2000001-0030-4000-8000-000000000030', title: 'Bài L30 – Ôn Tập Từ Vựng Xã Hội: 80 Từ Tần Suất Cao N2' },
    { id: '31', uuid: 'b2000001-0031-4000-8000-000000000031', title: 'Bài L31 – ~ばかりに + ~あまり: Chính Vì / Quá Mức Đến Nỗi' },
    { id: '32', uuid: 'b2000001-0032-4000-8000-000000000032', title: 'Bài L32 – ~からこそ + ~からといって: Chính Vì / Tuy Là... Nhưng' },
    { id: '33', uuid: 'b2000001-0033-4000-8000-000000000033', title: 'Bài L33 – ~からして + ~ものだから: Ngay Cả / Bởi Vì' },
    { id: '34', uuid: 'b2000001-0034-4000-8000-000000000034', title: 'Bài L34 – ~としても + ~にしても + ~にしろ: Dù Là / Dù Sao Thì' },
    { id: '35', uuid: 'b2000001-0035-4000-8000-000000000035', title: 'Bài L35 – ~にせよ + ~や否や: Dù Sao / Ngay Khi' },
    { id: '36', uuid: 'b2000001-0036-4000-8000-000000000036', title: 'Bài L36 – ~がちだ + ~気味: Hay Có Xu Hướng / Hơi Có Vẻ' },
    { id: '37', uuid: 'b2000001-0037-4000-8000-000000000037', title: 'Bài L37 – ~っぽい + ~げ: Có Vẻ / Mang Tính Chất' },
    { id: '38', uuid: 'b2000001-0038-4000-8000-000000000038', title: 'Bài L38 – ~かのようだ: Như Thể / Tựa Như' },
    { id: '39', uuid: 'b2000001-0039-4000-8000-000000000039', title: 'Bài L39 – ~うちに + ~ところに + ~たて: Trong Khi / Đúng Lúc / Vừa Mới' },
    { id: '40', uuid: 'b2000001-0040-4000-8000-000000000040', title: 'Bài L40 – ~のもとで + ~のあまり: Dưới Sự / Do Quá' },
    { id: '41', uuid: 'b2000001-0041-4000-8000-000000000041', title: 'Bài L41 – ~ぬきで + ~ぬく + ~きる: Không Có / Đến Cùng / Hết Sức' },
    { id: '42', uuid: 'b2000001-0042-4000-8000-000000000042', title: 'Bài L42 – Kanji Nhóm 3: Nghệ Thuật, Văn Học & Triết Học' },
    { id: '43', uuid: 'b2000001-0043-4000-8000-000000000043', title: 'Bài L43 – Onomatopoeia Top 50:擬音語・擬態語' },
    { id: '44', uuid: 'b2000001-0044-4000-8000-000000000044', title: 'Bài L44 – 慣用句 Top 40: Thành Ngữ Nhật Bản Tần Suất Cao' },
    { id: '45', uuid: 'b2000001-0045-4000-8000-000000000045', title: 'Bài L45 – MOCK TEST 1: Bài Thi Thử N2 Đầy Đủ' },
    { id: '46', uuid: 'b2000001-0046-4000-8000-000000000046', title: 'Bài L46 – Review Mock 1 + Chiến Lược Đọc Hiểu N2' },
    { id: '47', uuid: 'b2000001-0047-4000-8000-000000000047', title: 'Bài L47 – MOCK TEST 2: Bài Thi Thử N2 Lần 2' },
    { id: '48', uuid: 'b2000001-0048-4000-8000-000000000048', title: 'Bài L48 – Review Mock 2 + Chiến Lược Nghe Hiểu N2' },
    { id: '49', uuid: 'b2000001-0049-4000-8000-000000000049', title: 'Bài L49 – MOCK TEST 3: Bài Thi Thử N2 Lần 3' },
    { id: '50', uuid: 'b2000001-0050-4000-8000-000000000050', title: 'Bài L50 – Final Review: Ôn Tập Tổng Hợp N2 + Mock Test 4' },
];
const courseRef = doc(db, BASE + '/courses/' + COURSE_ID);
const sessionsCol = collection(db, BASE + '/courses/' + COURSE_ID + '/sessions');
const existingSessionsSnap = await getDocs(sessionsCol);
let SESSION_ID = null;
for (const s of existingSessionsSnap.docs) { if ((s.data().title || '').includes('N2')) { SESSION_ID = s.id; break; } }
if (!SESSION_ID) {
    const r = doc(sessionsCol); const sb = writeBatch(db);
    sb.set(r, { courseId: COURSE_ID, title: SESSION_TITLE, orderIndex: 1, videoCount: 0, parentId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await sb.commit(); SESSION_ID = r.id; console.log('Created session:', SESSION_ID);
}
console.log('Session:', SESSION_ID);
const existingSnap = await getDocs(collection(db, BASE + '/courses/' + COURSE_ID + '/videos'));
const existingIds = new Set(existingSnap.docs.map(d => d.id));
const existingTitles = new Set(existingSnap.docs.map(d => { const t = d.data().title; return typeof t === 'string' ? t : (t?.vi || ''); }));
const sessionRef = doc(db, BASE + '/courses/' + COURSE_ID + '/sessions/' + SESSION_ID);
let added = 0, skipped = 0;
for (const lesson of LESSONS) {
    if (existingIds.has(lesson.uuid) || existingTitles.has(lesson.title)) { console.log('  SKIP  L' + lesson.id); skipped++; continue; }
    const fp = LESSONS_DIR + '/L' + lesson.id + '.md';
    if (!existsSync(fp)) { console.log('  MISS  L' + lesson.id); skipped++; continue; }
    const content = readFileSync(fp, 'utf8');
    const batch = writeBatch(db);
    batch.set(doc(db, BASE + '/courses/' + COURSE_ID + '/videos/' + lesson.uuid), { courseId: COURSE_ID, sessionId: SESSION_ID, title: { vi: lesson.title }, adminId: ADMIN_ID, createdAt: serverTimestamp(), type: 'text', content });
    batch.update(courseRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    try { await batch.commit(); console.log('  OK    L' + lesson.id + ' – ' + lesson.title); added++; }
    catch (err) { console.error('  FAIL  L' + lesson.id + ':', err.message); }
}
console.log('\nDone. Added: ' + added + '  Skipped: ' + skipped);
process.exit(0);