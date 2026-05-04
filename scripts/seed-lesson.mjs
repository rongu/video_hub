/**
 * seed-lesson.mjs
 * 
 * Script thêm bài học từ file .md vào Firebase Firestore.
 * 
 * Cách chạy:
 *   node scripts/seed-lesson.mjs --email admin@example.com --password yourpass --file "C:\path\to\L03.md" --course-title "N5"
 * 
 * Hoặc chạy interactive (sẽ hỏi từng field):
 *   node scripts/seed-lesson.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, writeBatch, increment, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Đọc .env.local ───────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

if (!existsSync(envPath)) {
    console.error('❌ Không tìm thấy file .env.local!');
    process.exit(1);
}

const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
    envContent.split('\n')
        .filter(line => line.includes('='))
        .map(line => {
            const [key, ...rest] = line.split('=');
            return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
        })
);

const firebaseConfig = {
    apiKey:            env.VITE_FIREBASE_API_KEY,
    authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             env.VITE_FIREBASE_APP_ID,
};

const APP_ID_ROOT = 'video-hub-prod-id';

// ─── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
};

// ─── Prompt helper ────────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const prompt = (q) => new Promise(resolve => rl.question(q, resolve));
const promptPassword = async (q) => {
    process.stdout.write(q);
    return new Promise(resolve => {
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        let password = '';
        stdin.on('data', function handler(ch) {
            if (ch === '\r' || ch === '\n') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', handler);
                process.stdout.write('\n');
                resolve(password);
            } else if (ch === '\u0003') {
                process.exit();
            } else if (ch === '\u007f') {
                password = password.slice(0, -1);
            } else {
                password += ch;
                process.stdout.write('*');
            }
        });
    });
};

// ─── UUID v4 (không cần npm package) ─────────────────────────────────────────
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀 Firebase Lesson Seeder\n');

    // 1. Lấy credentials
    const email    = getArg('email')    || await prompt('📧 Admin email: ');
    const password = getArg('password') || await promptPassword('🔑 Admin password: ');
    const mdFile   = getArg('file')     || await prompt('📄 Đường dẫn file .md: ');
    const courseSearch = getArg('course-title') || await prompt('🎓 Tên khóa học (e.g. "N5"): ');
    const sessionTitle = getArg('session') || await prompt('📚 Tên session/chương (Enter để dùng "Tuần 1"): ') || 'Tuần 1';

    rl.close();

    // 2. Đọc markdown file
    const mdPath = resolve(mdFile);
    if (!existsSync(mdPath)) {
        console.error(`❌ Không tìm thấy file: ${mdPath}`);
        process.exit(1);
    }
    const markdownContent = readFileSync(mdPath, 'utf8');

    // Extract title from first H1 in markdown
    const titleMatch = markdownContent.match(/^#\s+(.+)/m);
    const lessonTitle = titleMatch ? titleMatch[1].trim() : mdPath.split(/[\\/]/).pop().replace('.md', '');
    console.log(`\n📖 Tiêu đề bài học: ${lessonTitle}`);

    // 3. Init Firebase
    const app  = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db   = getFirestore(app);

    // 4. Sign in
    console.log('\n🔐 Đang đăng nhập...');
    let userCred;
    try {
        userCred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        console.log(`✅ Đăng nhập thành công: ${userCred.user.email}`);
    } catch (err) {
        console.error(`❌ Đăng nhập thất bại: ${err.message}`);
        process.exit(1);
    }

    const adminId = userCred.user.uid;
    const basePath = `artifacts/${APP_ID_ROOT}/public/data`;

    // 5. Tìm khóa học N5
    console.log(`\n🔍 Tìm khóa học "${courseSearch}"...`);
    const coursesRef = collection(db, `${basePath}/courses`);
    const coursesSnap = await getDocs(coursesRef);
    
    let targetCourse = null;
    for (const d of coursesSnap.docs) {
        const data = d.data();
        const title = data.title;
        // title có thể là string hoặc object {vi, ja, en}
        const titleStr = typeof title === 'string'
            ? title
            : (title?.vi || title?.en || title?.ja || JSON.stringify(title));
        
        if (titleStr.toLowerCase().includes(courseSearch.toLowerCase())) {
            targetCourse = { id: d.id, ...data, titleStr };
            break;
        }
    }

    if (!targetCourse) {
        console.log('\n📋 Danh sách khóa học hiện có:');
        coursesSnap.docs.forEach(d => {
            const t = d.data().title;
            const ts = typeof t === 'string' ? t : (t?.vi || JSON.stringify(t));
            console.log(`  - [${d.id}] ${ts}`);
        });
        console.error(`\n❌ Không tìm thấy khóa học chứa "${courseSearch}"`);
        process.exit(1);
    }

    console.log(`✅ Tìm thấy: [${targetCourse.id}] ${targetCourse.titleStr}`);

    // 6. Tìm hoặc tạo session
    console.log(`\n🔍 Tìm session "${sessionTitle}" trong khóa học...`);
    const sessionsRef = collection(db, `${basePath}/courses/${targetCourse.id}/sessions`);
    const sessionsSnap = await getDocs(query(sessionsRef, orderBy('orderIndex', 'asc')));

    let targetSession = null;
    const maxOrder = sessionsSnap.docs.reduce((max, d) => Math.max(max, d.data().orderIndex || 0), 0);
    
    for (const d of sessionsSnap.docs) {
        const title = d.data().title || '';
        if (title.toLowerCase().includes(sessionTitle.toLowerCase())) {
            targetSession = { id: d.id, ...d.data() };
            break;
        }
    }

    if (!targetSession) {
        console.log(`⚠️  Không tìm thấy session "${sessionTitle}". Tạo session mới...`);
        const newSessionRef = doc(sessionsRef);
        const batch = writeBatch(db);
        batch.set(newSessionRef, {
            courseId: targetCourse.id,
            title: sessionTitle,
            orderIndex: maxOrder + 1,
            videoCount: 0,
            parentId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        await batch.commit();
        targetSession = { id: newSessionRef.id, title: sessionTitle };
        console.log(`✅ Đã tạo session mới: [${targetSession.id}] "${sessionTitle}"`);
    } else {
        console.log(`✅ Tìm thấy session: [${targetSession.id}] "${targetSession.title}"`);
    }

    // 7. Kiểm tra xem bài đã tồn tại chưa
    const videosRef = collection(db, `${basePath}/courses/${targetCourse.id}/videos`);
    const videosSnap = await getDocs(videosRef);
    const existingLesson = videosSnap.docs.find(d => {
        const t = d.data().title;
        const ts = typeof t === 'string' ? t : (t?.vi || '');
        return ts.includes(lessonTitle) || ts.includes(mdPath.split(/[\\/]/).pop().replace('.md', ''));
    });

    if (existingLesson) {
        console.log(`\n⚠️  Bài học đã tồn tại: [${existingLesson.id}] — bỏ qua.`);
        process.exit(0);
    }

    // 8. Thêm bài học
    console.log(`\n➕ Đang thêm bài học...`);
    const videoId = uuidv4();
    const videoDocRef = doc(videosRef, videoId);
    const courseDocRef = doc(db, `${basePath}/courses/${targetCourse.id}`);
    const sessionDocRef = doc(sessionsRef, targetSession.id);

    const batch = writeBatch(db);
    batch.set(videoDocRef, {
        courseId: targetCourse.id,
        sessionId: targetSession.id,
        title: { vi: lessonTitle },
        adminId,
        createdAt: serverTimestamp(),
        type: 'text',
        content: markdownContent,
    });
    batch.update(courseDocRef,  { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionDocRef, { videoCount: increment(1), updatedAt: serverTimestamp() });

    await batch.commit();

    console.log(`\n✅ Đã thêm thành công!`);
    console.log(`   📌 Lesson ID : ${videoId}`);
    console.log(`   📌 Course    : ${targetCourse.titleStr} [${targetCourse.id}]`);
    console.log(`   📌 Session   : ${targetSession.title} [${targetSession.id}]`);
    console.log(`   📌 Title     : ${lessonTitle}`);
    console.log(`   📌 Type      : text (markdown)\n`);

    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Lỗi:', err.message);
    process.exit(1);
});
