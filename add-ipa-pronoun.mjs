/**
 * add-ipa-pronoun.mjs
 *
 * Seed cac bai hoc IPA Pronunciation (40 bai, .md) vao Firebase Firestore.
 * Moi file .md = 1 bai hoc type "text", session duoc nhom theo "module" trong
 * frontmatter cua file.
 *
 * Usage: node add-ipa-pronoun.mjs <email> <password> [--dry-run]
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs, increment, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { readFileSync, readdirSync } from 'fs';

const app = initializeApp({
    apiKey: 'AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8',
    projectId: 'video-hub-1',
    storageBucket: 'video-hub-1.firebasestorage.app',
    appId: '1:165232200741:web:d34258d29e98f52d7c83cc',
});
const db   = getFirestore(app);
const auth = getAuth(app);

const email    = process.argv[2];
const password = process.argv[3];
const DRY_RUN  = process.argv.includes('--dry-run');

if (!email || !password) {
    console.error('Usage: node add-ipa-pronoun.mjs <email> <password> [--dry-run]');
    process.exit(1);
}
if (DRY_RUN) console.log('DRY RUN mode');

let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in:', userCred.user.uid);
} catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
}

const COURSE_ID    = 'Hv2oYyqzFr0u3kdNcOqp';
const ADMIN_ID     = userCred.user.uid;
const BASE         = 'artifacts/video-hub-prod-id/public/data';
const LESSONS_DIR  = 'C:/Users/long/Documents/englishcourse/ipa-pronoun/lessons';

const courseRef   = doc(db, `${BASE}/courses/${COURSE_ID}`);
const sessionsCol = collection(db, `${BASE}/courses/${COURSE_ID}/sessions`);
const videosCol   = collection(db, `${BASE}/courses/${COURSE_ID}/videos`);

// UUID deterministic tu so thu tu bai hoc: ipa00001-0000-4000-8000-000000000000
const makeUUID = (num) => `ipa${String(num).padStart(5, '0')}-0000-4000-8000-000000000000`;

// Parse frontmatter (--- ... ---) don gian dang key: value
const parseFrontmatter = (content) => {
    const m = content.match(/^---\n([\s\S]*?)\n---/);
    const meta = {};
    if (m) {
        for (const line of m[1].split('\n')) {
            const idx = line.indexOf(':');
            if (idx === -1) continue;
            meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
    }
    return meta;
};

// Lay tieu de tu dong H1 dau tien (# L01 — Bilabial Plosive: /p/ and /b/)
const getTitleFromMd = (content) => {
    const m = content.match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : '';
};

// ── Doc va nhom lesson theo module ──────────────────────────────────────────
const files = readdirSync(LESSONS_DIR).filter(f => f.endsWith('.md')).sort();

const lessons = files.map(file => {
    const content = readFileSync(`${LESSONS_DIR}/${file}`, 'utf8');
    const meta    = parseFrontmatter(content);
    const numMatch = file.match(/^L(\d+)/);
    const num     = numMatch ? parseInt(numMatch[1]) : 0;
    return {
        file,
        num,
        uuid:    makeUUID(num),
        module:  meta.module || 'Uncategorized',
        title:   getTitleFromMd(content) || meta.title || file.replace('.md', ''),
        content,
    };
});

const moduleOrder = [];
for (const l of lessons) {
    if (!moduleOrder.includes(l.module)) moduleOrder.push(l.module);
}

// ── Session hien co ─────────────────────────────────────────────────────────
const sessionsSnap = await getDocs(sessionsCol);
const sessionMap = {}; // module title -> sessionId
for (const s of sessionsSnap.docs) {
    const title = s.data().title || '';
    if (moduleOrder.includes(title)) sessionMap[title] = s.id;
}

// ── Video hien co (detect trung theo UUID) ──────────────────────────────────
const videosSnap  = await getDocs(videosCol);
const existingIds = new Set(videosSnap.docs.map(d => d.id));

console.log(`\nTim thay ${files.length} file, ${moduleOrder.length} module, ${existingIds.size} bai da co trong course.\n`);

// ── Tao session con thieu ───────────────────────────────────────────────────
for (let i = 0; i < moduleOrder.length; i++) {
    const moduleTitle = moduleOrder[i];
    if (sessionMap[moduleTitle]) continue;

    if (DRY_RUN) {
        console.log(`[DRY] Would create session: "${moduleTitle}"`);
        continue;
    }
    const sessionDocRef = doc(sessionsCol);
    const sb = writeBatch(db);
    sb.set(sessionDocRef, {
        courseId:   COURSE_ID,
        title:      moduleTitle,
        orderIndex: i + 1,
        videoCount: 0,
        parentId:   null,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
    });
    await sb.commit();
    sessionMap[moduleTitle] = sessionDocRef.id;
    console.log(`Created session "${moduleTitle}" -> ${sessionDocRef.id}`);
}

// ── Them bai hoc ─────────────────────────────────────────────────────────────
let added = 0, skipped = 0, failed = 0;

for (const lesson of lessons) {
    if (existingIds.has(lesson.uuid)) {
        console.log(`  SKIP  ${lesson.file} (already exists)`);
        skipped++;
        continue;
    }

    const sessionId = sessionMap[lesson.module];
    if (DRY_RUN) {
        console.log(`  [DRY] ${lesson.file} -> "${lesson.title}" | module: "${lesson.module}" | session: ${sessionId || 'NEW'}`);
        added++;
        continue;
    }
    if (!sessionId) {
        console.log(`  MISS  ${lesson.file} (no session for module "${lesson.module}")`);
        failed++;
        continue;
    }

    const sessionRef = doc(db, `${BASE}/courses/${COURSE_ID}/sessions/${sessionId}`);
    const batch = writeBatch(db);
    batch.set(doc(db, `${BASE}/courses/${COURSE_ID}/videos/${lesson.uuid}`), {
        courseId:  COURSE_ID,
        sessionId,
        title:     { vi: lesson.title, en: lesson.title },
        adminId:   ADMIN_ID,
        createdAt: serverTimestamp(),
        type:      'text',
        content:   lesson.content,
    });
    batch.update(courseRef,  { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });

    try {
        await batch.commit();
        console.log(`  OK    ${lesson.file} - ${lesson.title}`);
        added++;
    } catch (err) {
        console.error(`  FAIL  ${lesson.file}:`, err.message);
        failed++;
    }
}

console.log(`\nDone${DRY_RUN ? ' (DRY RUN)' : ''}. Added: ${added}  Skipped: ${skipped}  Failed: ${failed}`);
process.exit(0);
