/**
 * add-english-kid.mjs
 * Seed English Kids conversations course vào Firebase.
 * Mỗi cặp video .mp4 + .md = 1 bài học type "custom" (Tương tác).
 * Video được upload lên Firebase Storage, markdown content lưu trong blockData.
 *
 * Usage: node add-english-kid.mjs <email> <password> [--dry-run]
 *   --dry-run   : Kiểm tra file, không ghi Firestore / Storage
 */

import { initializeApp } from 'firebase/app';
import {
    getFirestore, doc, writeBatch,
    collection, getDocs, getDoc, setDoc,
    increment, serverTimestamp
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';

// ── Firebase config ────────────────────────────────────────────────────────
const app = initializeApp({
    apiKey: 'AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8',
    projectId: 'video-hub-1',
    storageBucket: 'video-hub-1.firebasestorage.app',
    appId: '1:165232200741:web:d34258d29e98f52d7c83cc',
});
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ── Args ───────────────────────────────────────────────────────────────────
const email = process.argv[2];
const password = process.argv[3];
const args = process.argv.slice(4);
const DRY_RUN = args.includes('--dry-run');

if (!email || !password) {
    console.error('Usage: node add-english-kid.mjs <email> <password> [--dry-run]');
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
const ADMIN_ID = userCred.user.uid;
const BASE = 'artifacts/video-hub-prod-id/public/data';
const INPUT_DIR = 'C:/Users/LongTM4/Documents/english/video_out';
const COURSE_TITLE_VI = 'English Kids - Hội thoại';
const COURSE_TITLE_EN = 'English Kids - Easy Conversation';
const SESSION_TITLE_VI = 'Easy Conversations';
const SESSION_TITLE_EN = 'Easy Conversations';

// UUID pattern: ek{lesson:04d}-0000-4000-8000-000000000000
const makeUUID = (lessonNum) =>
    `ek${String(lessonNum).padStart(4, '0')}-0000-4000-8000-000000000000`;

// ── Helper: Extract title from markdown ────────────────────────────────────
const getTitleFromMd = (mdContent) => {
    const firstLine = mdContent.split('\n')[0].replace(/^#+\s*/, '').trim();
    return firstLine;
};

// ─── Helper: delete docs in batches of 500 ───────────────────────────────────
async function deleteDocs(snapshotDocs) {
    for (let i = 0; i < snapshotDocs.length; i += 490) {
        const chunk = snapshotDocs.slice(i, i + 490);
        const b = writeBatch(db);
        chunk.forEach(d => b.delete(d.ref));
        await b.commit();
    }
}

// ── Helper: Upload video file ──────────────────────────────────────────────
const uploadVideo = async (localPath, fileName, lessonUUID) => {
    const data = readFileSync(localPath);
    const storagePath = `artifacts/video-hub-prod-id/assets/${COURSE_ID}/${lessonUUID}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    const contentType = fileName.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';
    await uploadBytes(storageRef, data, { contentType });
    const url = await getDownloadURL(storageRef);
    
    return {
        id: `${lessonUUID}-v01`,
        name: fileName,
        url,
        duration: 0,
        thumbnail: null,
    };
};

// ── Find or create course ──────────────────────────────────────────────────
const coursesCol = collection(db, `${BASE}/courses`);
const courseSnap = await getDocs(coursesCol);
let COURSE_ID = null;

for (const doc of courseSnap.docs) {
    const title = doc.data().title || {};
    if (title.vi === COURSE_TITLE_VI || title.en === COURSE_TITLE_EN) {
        COURSE_ID = doc.id;
        console.log('📖 Found existing course:', COURSE_ID);
        break;
    }
}

if (COURSE_ID) {
    console.log('Found existing course:', COURSE_ID);
    console.log('Deleting existing videos and sessions...');

    const videosSnap   = await getDocs(collection(db, BASE + '/courses/' + COURSE_ID + '/videos'));
    const sessionsSnap = await getDocs(collection(db, BASE + '/courses/' + COURSE_ID + '/sessions'));

    await deleteDocs(videosSnap.docs);
    console.log(`  Deleted ${videosSnap.size} videos`);
    await deleteDocs(sessionsSnap.docs);
    console.log(`  Deleted ${sessionsSnap.size} sessions`);

    // Reset videoCount on course
    const b = writeBatch(db);
    b.update(doc(db, BASE + '/courses/' + COURSE_ID), { videoCount: 0, updatedAt: serverTimestamp() });
    await b.commit();
}

if (!COURSE_ID) {
    if (DRY_RUN) {
        console.log(`[DRY] Would create course: "${COURSE_TITLE_VI}"`);
        COURSE_ID = 'DRY_COURSE_ID';
    } else {
        const newCourseRef = doc(coursesCol);
        COURSE_ID = newCourseRef.id;
        await setDoc(newCourseRef, {
            title: { vi: COURSE_TITLE_VI, en: COURSE_TITLE_EN },
            description: { vi: 'Các hội thoại tiếng Anh đơn giản cho trẻ em từ các bộ phim hoạt hình' },
            adminId: ADMIN_ID,
            videoCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log('✅ Created new course:', COURSE_ID);
    }
}

// ── Load existing videos ───────────────────────────────────────────────────
const videosSnap = await getDocs(collection(db, `${BASE}/courses/${COURSE_ID}/videos`));
const existingIds = new Set(videosSnap.docs.map(d => d.id));

// ── Find or create session ─────────────────────────────────────────────────
const sessionsCol = collection(db, `${BASE}/courses/${COURSE_ID}/sessions`);
const sessionsSnap = await getDocs(sessionsCol);

let SESSION_ID = null;
for (const s of sessionsSnap.docs) {
    const title = s.data().title || '';
    if (title === SESSION_TITLE_VI || title === SESSION_TITLE_EN) {
        SESSION_ID = s.id;
        console.log('📂 Found existing session:', SESSION_ID);
        break;
    }
}

if (!SESSION_ID) {
    if (DRY_RUN) {
        console.log(`[DRY] Would create session: "${SESSION_TITLE_VI}"`);
        SESSION_ID = 'DRY_SESSION_ID';
    } else {
        const newSessionRef = doc(sessionsCol);
        SESSION_ID = newSessionRef.id;
        await setDoc(newSessionRef, {
            courseId: COURSE_ID,
            title: SESSION_TITLE_VI,
            orderIndex: 1,
            videoCount: 0,
            parentId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log('✅ Created session:', SESSION_ID);
    }
}

// ── Load video/MD pairs ────────────────────────────────────────────────────
console.log(`\n📂 Reading from: ${INPUT_DIR}`);

const allFiles = readdirSync(INPUT_DIR).sort();
const mdFiles = allFiles.filter(f => f.endsWith('.md') && !f.includes('_transcripts'));

console.log(`\n📝 Found ${mdFiles.length} markdown files\n`);

// ── Main loop ──────────────────────────────────────────────────────────────
let totalAdded = 0, totalSkipped = 0, totalFailed = 0;

const courseRef = doc(db, `${BASE}/courses/${COURSE_ID}`);
const sessionRef = doc(db, `${BASE}/courses/${COURSE_ID}/sessions/${SESSION_ID}`);

for (const mdFile of mdFiles) {
    // Extract lesson number from filename: kids-cartoon-easy-conversation-01.md → 01 → 1
    const numMatch = mdFile.match(/(\d+)\.md$/);
    const lessonNum = numMatch ? parseInt(numMatch[1]) : 0;
    const lessonUUID = makeUUID(lessonNum);

    const baseName = mdFile.replace(/\.md$/, '');
    const mp4File = `${baseName}.mp4`;
    const mdPath = `${INPUT_DIR}/${mdFile}`;
    const mp4Path = `${INPUT_DIR}/${mp4File}`;

    if (!existsSync(mp4Path)) {
        console.log(`❌ ${mdFile} — missing corresponding video ${mp4File}`);
        totalFailed++;
        continue;
    }

    const mdContent = readFileSync(mdPath, 'utf8');
    const title = getTitleFromMd(mdContent);
    const isUpdate = existingIds.has(lessonUUID);

    const videoStats = statSync(mp4Path);
    const videoSize = (videoStats.size / 1024 / 1024).toFixed(2);

    if (isUpdate) {
        console.log(`🔄 UPDATE Lesson ${lessonNum}: "${title}" (${videoSize}MB)`);
    } else {
        console.log(`⬆️  Lesson ${lessonNum}: "${title}" + ${mp4File} (${videoSize}MB)`);
    }

    if (DRY_RUN) {
        console.log(`   → UUID: ${lessonUUID}`);
        totalAdded++;
        continue;
    }

    try {
        // Upload video
        const videoItem = await uploadVideo(mp4Path, mp4File, lessonUUID);
        console.log(`   ✅ uploaded video`);

        const blockData = [{
            id: `${lessonUUID}-b01`,
            description: '',
            markdownContent: mdContent,
            audios: [],
            videos: [videoItem],
            images: [],
            vocabularyGroups: [],
            quizzes: [],
            grammars: [],
        }];

        const batch = writeBatch(db);
        batch.set(doc(db, `${BASE}/courses/${COURSE_ID}/videos/${lessonUUID}`), {
            courseId: COURSE_ID,
            sessionId: SESSION_ID,
            title: { en: title, vi: title },
            adminId: ADMIN_ID,
            createdAt: serverTimestamp(),
            type: 'custom',
            blockData,
        });

        if (!isUpdate) {
            batch.update(courseRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
            batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
        } else {
            batch.update(courseRef, { updatedAt: serverTimestamp() });
        }

        await batch.commit();
        
        if (isUpdate) {
            console.log(`   ✅ updated "${title}"\n`);
            totalSkipped++;
        } else {
            console.log(`   ✅ saved "${title}"\n`);
            totalAdded++;
        }
    } catch (err) {
        console.error(`   ❌ FAIL:`, err.message, `\n`);
        totalFailed++;
    }
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Done${DRY_RUN ? ' (DRY RUN)' : ''}.`);
console.log(`  Added (new):      ${totalAdded}`);
console.log(`  Updated (upsert): ${totalSkipped}`);
console.log(`  Failed:           ${totalFailed}`);
process.exit(0);
