/**
 * Generator: rewrites add-jlptn1~4.mjs with new template (audio support + reset).
 * Run: node scripts/_gen_jlpt.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const HEADER = (script, level, courseId, sessionTitle, levelDir) => `/**
 * ${script}
 * Seed JLPT ${level} course lessons vào Firebase.
 * Mỗi file L##.md = 1 bài học type "custom", có markdownContent + audios (L##-conv*.mp3).
 * Toàn bộ bài cũ sẽ bị XÓA rồi thêm lại từ đầu mỗi lần chạy.
 *
 * Usage: node ${script} <email> <password> [--dry-run]
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
if (!email || !password) { console.error('Usage: node ${script} <email> <password> [--dry-run]'); process.exit(1); }
if (DRY_RUN) console.log('\\u26a1 DRY RUN mode \\u2014 kh\\u00f4ng ghi d\\u1eef li\\u1ec7u');

let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('\\u2705 Signed in:', userCred.user.uid);
} catch (err) {
    console.error('\\u274c Login failed:', err.message);
    process.exit(1);
}

const COURSE_ID     = '${courseId}';
const SESSION_TITLE = '${sessionTitle}';
const ADMIN_ID      = userCred.user.uid;
const BASE          = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_DIR   = 'C:/Users/LongTM4/Downloads/jlpt/lesson-${levelDir}';

`;

const FOOTER = `

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
    const storagePath = \`artifacts/video-hub-prod-id/assets/\${COURSE_ID}/\${lessonUUID}/\${fileName}\`;
    const storageRef  = ref(storage, storagePath);
    await uploadBytes(storageRef, data, { contentType: 'audio/mpeg' });
    const url = await getDownloadURL(storageRef);
    return {
        id:   \`\${lessonUUID}-a\${String(index).padStart(2, '0')}\`,
        name: fileName,
        url,
    };
}

// ── Delete all existing videos + sessions ──────────────────────────────────
const courseRef   = doc(db, \`\${BASE}/courses/\${COURSE_ID}\`);
const sessionsCol = collection(db, \`\${BASE}/courses/\${COURSE_ID}/sessions\`);

if (!DRY_RUN) {
    console.log('\\n\\u{1f5d1}\\ufe0f  X\\u00f3a d\\u1eef li\\u1ec7u c\\u0169...');
    const oldVideos   = await getDocs(collection(db, \`\${BASE}/courses/\${COURSE_ID}/videos\`));
    const oldSessions = await getDocs(sessionsCol);
    await deleteDocs(oldVideos.docs);
    console.log(\`   Deleted \${oldVideos.size} videos\`);
    await deleteDocs(oldSessions.docs);
    console.log(\`   Deleted \${oldSessions.size} sessions\`);
    const rb = writeBatch(db);
    rb.update(courseRef, { videoCount: 0, updatedAt: serverTimestamp() });
    await rb.commit();
}

// ── Create session ─────────────────────────────────────────────────────────
let SESSION_ID;
if (DRY_RUN) {
    SESSION_ID = 'DRY_SESSION';
    console.log('\\n[DRY] Would create session:', SESSION_TITLE);
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
    console.log('\\n\\u2705 Created session:', SESSION_ID);
}
const sessionRef = doc(db, \`\${BASE}/courses/\${COURSE_ID}/sessions/\${SESSION_ID}\`);

// ── Process lessons ────────────────────────────────────────────────────────
const allFiles    = existsSync(LESSONS_DIR) ? readdirSync(LESSONS_DIR).sort() : [];
let totalAdded = 0, totalSkipped = 0, totalFailed = 0;

for (const lesson of LESSONS) {
    const mdFile   = \`L\${lesson.id}.md\`;
    const mdPath   = \`\${LESSONS_DIR}/\${mdFile}\`;
    const mp3Files = allFiles.filter(f => f.startsWith(\`L\${lesson.id}-\`) && f.endsWith('.mp3')).sort();

    if (!existsSync(mdPath)) {
        console.log(\`  MISS  \${mdFile}\`);
        totalSkipped++;
        continue;
    }

    const mdContent = readFileSync(mdPath, 'utf8');
    console.log(\`  \${mdFile}\${mp3Files.length ? \` + \${mp3Files.length} audio\` : ''}\`);

    if (DRY_RUN) {
        mp3Files.forEach(f => console.log(\`       -> audio: \${f}\`));
        totalAdded++;
        continue;
    }

    const audioItems = [];
    for (let i = 0; i < mp3Files.length; i++) {
        try {
            const item = await uploadAudio(\`\${LESSONS_DIR}/\${mp3Files[i]}\`, mp3Files[i], lesson.uuid, i + 1);
            audioItems.push(item);
            console.log(\`       OK \${mp3Files[i]}\`);
        } catch (err) {
            console.error(\`       FAIL upload \${mp3Files[i]}:\`, err.message);
        }
    }

    const blockData = [{
        id:               \`\${lesson.uuid}-b01\`,
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
    batch.set(doc(db, \`\${BASE}/courses/\${COURSE_ID}/videos/\${lesson.uuid}\`), {
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
        console.log(\`       saved "\${lesson.title}"\`);
        totalAdded++;
    } catch (err) {
        console.error(\`       FAIL "\${lesson.title}":\`, err.message);
        totalFailed++;
    }
}

console.log(\`\\n\${'─'.repeat(50)}\`);
console.log(\`Done\${DRY_RUN ? ' (DRY RUN)' : ''}.\`);
console.log(\`  Added:   \${totalAdded}\`);
console.log(\`  Skipped: \${totalSkipped}\`);
console.log(\`  Failed:  \${totalFailed}\`);
process.exit(0);
`;

// Extract LESSONS array from original file
function extractLessons(src) {
    const start = src.indexOf('\nconst LESSONS = [');
    const end   = src.indexOf('];\n', start) + 3;
    return src.slice(start, end);
}

const configs = [
    { script: 'add-jlptn4.mjs', level: 'N4', courseId: 'ouBXr5GlgqVKYPFWTFnz', sessionTitle: 'N4 Lessons', levelDir: 'n4' },
    { script: 'add-jlptn3.mjs', level: 'N3', courseId: 'elI1VmZuMpKZPMMJRWmZ', sessionTitle: 'N3 Lessons', levelDir: 'n3' },
    { script: 'add-jlptn2.mjs', level: 'N2', courseId: 'FZxv2bsfDE0Eq6JpPEE3', sessionTitle: 'N2 Lessons', levelDir: 'n2' },
    { script: 'add-jlptn1.mjs', level: 'N1', courseId: 'yb2appbsOJFn1lxZ4Ulc', sessionTitle: 'N1 Lessons', levelDir: 'n1' },
];

for (const c of configs) {
    // Read the ORIGINAL file from git or find the LESSONS in the current version
    const src     = readFileSync(c.script, 'utf8');
    const lessons = extractLessons(src);
    const content = HEADER(c.script, c.level, c.courseId, c.sessionTitle, c.levelDir)
                  + lessons
                  + FOOTER;
    writeFileSync(c.script, content, 'utf8');
    console.log(`Written ${c.script} (${lessons.split('\n').length} lines in LESSONS block)`);
}
