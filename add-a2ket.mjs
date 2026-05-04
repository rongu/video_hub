/**
 * add-a2ket.mjs
 * Seed A2-KET English course lessons vào Firebase.
 * Mỗi file .md = 1 bài học type "custom" (Tương tác), có markdownContent + audios.
 * Audio (.mp3) cùng prefix với .md sẽ được upload lên Firebase Storage.
 *
 * Usage: node add-a2ket.mjs <email> <password> [--unit=N] [--dry-run]
 *   --unit=N    : Chỉ seed unit N (bỏ qua thì seed tất cả 1-14)
 *   --dry-run   : Kiểm tra file / session, không ghi Firestore / Storage
 */

import { initializeApp }        from 'firebase/app';
import {
    getFirestore, doc, writeBatch,
    collection, getDocs,
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
const args     = process.argv.slice(4);
const DRY_RUN  = args.includes('--dry-run');
const unitArg  = args.find(a => a.startsWith('--unit='));
const ONLY_UNIT = unitArg ? parseInt(unitArg.split('=')[1]) : null;

if (!email || !password) {
    console.error('Usage: node add-a2ket.mjs <email> <password> [--unit=N] [--dry-run]');
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
const COURSE_ID   = 'Q7guDyoYogpQhJmFhDrp'; // A2-KET
const ADMIN_ID    = userCred.user.uid;
const BASE        = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_ROOT = 'C:/Users/LongTM4/Documents/english/A2-output';

const UNIT_THEMES = {
     1: 'Hi, how are you?',
     2: 'Home',
     3: 'Food and Drink',
     4: 'Shopping',
     5: 'Getting Around',
     6: 'Daily Life',
     7: 'Health and Sport',
     8: 'Entertainment',
     9: 'Technology',
    10: 'The Natural World',
    11: 'Fashion',
    12: 'Travel',
    13: 'Work',
    14: 'Future Plans',
};

// UUID deterministic: a200{unit:02d}{lesson:02d}-0000-4000-8000-000000000000
const makeUUID = (unit, lesson) =>
    `a2${String(unit).padStart(4,'0')}${String(lesson).padStart(2,'0')}-0000-4000-8000-000000000000`;

// ── Load existing sessions ─────────────────────────────────────────────────
const courseRef    = doc(db, `${BASE}/courses/${COURSE_ID}`);
const sessionsCol  = collection(db, `${BASE}/courses/${COURSE_ID}/sessions`);
const sessionsSnap = await getDocs(sessionsCol);

/** unitNum → sessionId */
const sessionMap = {};
for (const s of sessionsSnap.docs) {
    const title = s.data().title || '';
    const m = title.match(/Unit\s*(\d+)/i);
    if (m) sessionMap[parseInt(m[1])] = s.id;
}
console.log('Existing sessions:', sessionMap);

// ── Load existing videos (chỉ dùng UUID để detect, không dùng title) ──────
// Lý do: nhiều bài khác unit có thể cùng title (Writing, Reading Part 1...),
// nếu check title sẽ bị false-positive skip.
const videosSnap  = await getDocs(collection(db, `${BASE}/courses/${COURSE_ID}/videos`));
const existingIds = new Set(videosSnap.docs.map(d => d.id));

// ── Helpers ────────────────────────────────────────────────────────────────
/**
 * Lấy tiêu đề từ dòng đầu tiên của file markdown (# Title — ...)
 * Loại bỏ phần " — Unit N: ..." để giữ tiêu đề ngắn gọn.
 */
const getTitleFromMd = (mdContent) => {
    const firstLine = mdContent.split('\n')[0].replace(/^#+\s*/, '').trim();
    // Cắt phần " — Unit N..." hoặc " – Unit N..."
    return firstLine.replace(/\s*[—–-]+\s*Unit\s*\d+.*/i, '').trim();
};

/**
 * Upload một file audio, trả về { id, name, url }
 */
const uploadAudio = async (localPath, fileName, lessonUUID, index) => {
    const data        = readFileSync(localPath);
    const storagePath = `artifacts/video-hub-prod-id/assets/${COURSE_ID}/${lessonUUID}/${fileName}`;
    const storageRef  = ref(storage, storagePath);
    await uploadBytes(storageRef, data, { contentType: 'audio/mpeg' });
    const url = await getDownloadURL(storageRef);
    return {
        id:   `${lessonUUID}-a${String(index).padStart(2,'0')}`,
        name: fileName,
        url,
    };
};

// ── Main loop ──────────────────────────────────────────────────────────────
let totalAdded = 0, totalSkipped = 0, totalFailed = 0;

const units = ONLY_UNIT ? [ONLY_UNIT] : Array.from({ length: 14 }, (_, i) => i + 1);

for (const unitNum of units) {
    const unitDir = `${LESSONS_ROOT}/unit${unitNum}`;
    if (!existsSync(unitDir)) {
        console.log(`\n⚠️  MISS unit${unitNum} folder — bỏ qua`);
        continue;
    }

    // ── Find / create session ──────────────────────────────────────────────
    if (!sessionMap[unitNum]) {
        const theme        = UNIT_THEMES[unitNum] || `Unit ${unitNum}`;
        const sessionTitle = `Unit ${unitNum}: ${theme}`;
        if (DRY_RUN) {
            console.log(`\n[DRY] Would create session: "${sessionTitle}"`);
        } else {
            const sessionDocRef = doc(sessionsCol);
            const sb = writeBatch(db);
            sb.set(sessionDocRef, {
                courseId:   COURSE_ID,
                title:      sessionTitle,
                orderIndex: unitNum,
                videoCount: 0,
                parentId:   null,
                createdAt:  serverTimestamp(),
                updatedAt:  serverTimestamp(),
            });
            await sb.commit();
            sessionMap[unitNum] = sessionDocRef.id;
            console.log(`\n✅ Created session "${sessionTitle}" → ${sessionDocRef.id}`);
        }
    }

    const SESSION_ID = sessionMap[unitNum];
    const sessionRef = SESSION_ID
        ? doc(db, `${BASE}/courses/${COURSE_ID}/sessions/${SESSION_ID}`)
        : null;

    console.log(`\n📘 Unit ${unitNum}: ${UNIT_THEMES[unitNum] || ''} (session: ${SESSION_ID || 'DRY'})`);

    // ── Enumerate .md files ────────────────────────────────────────────────
    const allFiles = readdirSync(unitDir).sort();
    const mdFiles  = allFiles.filter(f => f.endsWith('.md'));

    for (const mdFile of mdFiles) {
        // Lấy số thứ tự bài từ tên file: unit7-03-... → 3
        const numMatch  = mdFile.match(/unit\d+-(\d+)-/);
        const lessonNum = numMatch ? parseInt(numMatch[1]) : 0;
        const lessonUUID = makeUUID(unitNum, lessonNum);

        const mdPath    = `${unitDir}/${mdFile}`;
        const mdContent = readFileSync(mdPath, 'utf8');
        const title     = getTitleFromMd(mdContent);

        // Nếu UUID đã tồn tại → overwrite để cập nhật sessionId mới (không skip)
        // Nếu UUID chưa tồn tại → tạo mới, tăng counter
        const isUpdate = existingIds.has(lessonUUID);
        if (isUpdate) {
            console.log(`  🔄 UPDATE ${mdFile} (update sessionId → ${SESSION_ID})`);
        }

        // Tìm các file .mp3 liên kết (cùng prefix với md)
        const baseName = mdFile.replace(/\.md$/, '');
        const mp3Files = allFiles.filter(f => f.startsWith(baseName) && f.endsWith('.mp3')).sort();

        console.log(`  ⬆️  ${mdFile}${mp3Files.length ? ` + ${mp3Files.length} audio` : ''}`);

        if (DRY_RUN) {
            console.log(`     → title: "${title}" | UUID: ${lessonUUID}`);
            mp3Files.forEach(f => console.log(`     → audio: ${f}`));
            totalAdded++;
            continue;
        }

        // Upload audio files
        const audioItems = [];
        for (let i = 0; i < mp3Files.length; i++) {
            const mp3File = mp3Files[i];
            const mp3Path = `${unitDir}/${mp3File}`;
            try {
                const audioItem = await uploadAudio(mp3Path, mp3File, lessonUUID, i + 1);
                audioItems.push(audioItem);
                console.log(`     ✅ uploaded ${mp3File}`);
            } catch (err) {
                console.error(`     ❌ FAIL upload ${mp3File}:`, err.message);
            }
        }

        // Build blockData (1 block chứa toàn bộ nội dung + audio)
        const blockData = [{
            id:              `${lessonUUID}-b01`,
            description:     '',
            markdownContent: mdContent,
            audios:          audioItems,
            videos:          [],
            images:          [],
            vocabularyGroups:[],
            quizzes:         [],
            grammars:        [],
        }];

        // Ghi Firestore — luôn overwrite để cập nhật sessionId mới
        const batch = writeBatch(db);
        batch.set(doc(db, `${BASE}/courses/${COURSE_ID}/videos/${lessonUUID}`), {
            courseId:  COURSE_ID,
            sessionId: SESSION_ID,
            title:     { en: title, vi: title },
            adminId:   ADMIN_ID,
            createdAt: serverTimestamp(),
            type:      'custom',
            blockData,
        });
        // Chỉ tăng counter nếu là bài MỚI (không phải update)
        if (!isUpdate) {
            batch.update(courseRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
            if (sessionRef) batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
        } else {
            batch.update(courseRef, { updatedAt: serverTimestamp() });
        }

        try {
            await batch.commit();
            if (isUpdate) {
                console.log(`     ✅ updated sessionId "${title}"`);
                totalSkipped++; // cập nhật, không phải thêm mới
            } else {
                console.log(`     ✅ saved "${title}"`);
                totalAdded++;
            }
        } catch (err) {
            console.error(`     ❌ FAIL "${title}":`, err.message);
            totalFailed++;
        }
    }
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Done${DRY_RUN ? ' (DRY RUN)' : ''}.`);
console.log(`  Added (new):   ${totalAdded}`);
console.log(`  Updated (old session fixed): ${totalSkipped}`);
console.log(`  Failed:        ${totalFailed}`);
process.exit(0);
