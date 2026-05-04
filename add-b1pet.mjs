/**
 * add-b1pet.mjs
 * Seed B1-PET English course lessons vào Firebase.
 * Mỗi file .md = 1 bài học type "custom" (Tương tác), có markdownContent + audios.
 * Audio (.mp3) cùng prefix với .md sẽ được upload lên Firebase Storage.
 *
 * Usage: node add-b1pet.mjs <email> <password> [--unit=N] [--dry-run]
 *   --unit=N    : Chỉ seed unit N (bỏ qua thì seed tất cả 1-12)
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
    console.error('Usage: node add-b1pet.mjs <email> <password> [--unit=N] [--dry-run]');
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
const COURSE_ID    = 'satnNeqPYfA78tBkMrnB'; // B1-PET
const ADMIN_ID     = userCred.user.uid;
const BASE         = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_ROOT = 'C:/Users/LongTM4/Documents/english/B1-output';
const NUM_UNITS    = 12;
const UNIT_FOLDER_PREFIX = 'b1-unit'; // folder: b1-unit1, b1-unit2, ...

const UNIT_THEMES = {
     1: 'Homes and Habits',
     2: 'Student Days',
     3: 'Fun Time',
     4: 'Our World',
     5: 'Feelings',
     6: 'Leisure and Fashion',
     7: 'Out and about',
     8: 'This is me!',
     9: 'Travel',
    10: 'Downtime',
    11: 'Adventure',
    12: 'The World of Work',
};

// UUID deterministic: b1{unit:04d}{lesson:02d}-0000-4000-8000-000000000000
const makeUUID = (unit, lesson) =>
    `b1${String(unit).padStart(4,'0')}${String(lesson).padStart(2,'0')}-0000-4000-8000-000000000000`;

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

// ── Load existing videos (UUID-based, avoid false-positive title match) ───
const videosSnap  = await getDocs(collection(db, `${BASE}/courses/${COURSE_ID}/videos`));
const existingIds = new Set(videosSnap.docs.map(d => d.id));

// ── Helpers ────────────────────────────────────────────────────────────────
const getTitleFromMd = (mdContent) => {
    const firstLine = mdContent.split('\n')[0].replace(/^#+\s*/, '').trim();
    return firstLine.replace(/\s*[—–-]+\s*Unit\s*\d+.*/i, '').trim();
};

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

const units = ONLY_UNIT ? [ONLY_UNIT] : Array.from({ length: NUM_UNITS }, (_, i) => i + 1);

for (const unitNum of units) {
    const unitDir = `${LESSONS_ROOT}/${UNIT_FOLDER_PREFIX}${unitNum}`;
    if (!existsSync(unitDir)) {
        console.log(`\n⚠️  MISS ${UNIT_FOLDER_PREFIX}${unitNum} folder — bỏ qua`);
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
        const numMatch  = mdFile.match(/unit\d+-(\d+)-/);
        const lessonNum = numMatch ? parseInt(numMatch[1]) : 0;
        const lessonUUID = makeUUID(unitNum, lessonNum);

        const mdPath    = `${unitDir}/${mdFile}`;
        const mdContent = readFileSync(mdPath, 'utf8');
        const title     = getTitleFromMd(mdContent);

        const isUpdate = existingIds.has(lessonUUID);
        if (isUpdate) {
            console.log(`  🔄 UPDATE ${mdFile} (update sessionId → ${SESSION_ID})`);
        }

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
        if (!isUpdate) {
            batch.update(courseRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
            if (sessionRef) batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
        } else {
            batch.update(courseRef, { updatedAt: serverTimestamp() });
        }

        try {
            await batch.commit();
            if (isUpdate) {
                console.log(`     ✅ updated "${title}"`);
                totalSkipped++;
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
console.log(`  Added (new):     ${totalAdded}`);
console.log(`  Updated (upsert): ${totalSkipped}`);
console.log(`  Failed:          ${totalFailed}`);
process.exit(0);
