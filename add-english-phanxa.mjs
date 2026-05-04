import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs, getDoc, setDoc, deleteDoc, query, where, increment, serverTimestamp } from 'firebase/firestore';
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
    console.error('Usage: node add-english-phanxa.mjs <email> <password>');
    process.exit(1);
}

let userCred;
try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in:', userCred.user.uid);
} catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
}

const ADMIN_ID   = userCred.user.uid;
const BASE       = 'artifacts/video-hub-prod-id/public/data';
const TOPICS_DIR = 'C:/Users/LongTM4/Documents/english-giaotiep/topics';
const COURSE_TITLE_VI = 'English phản xạ';

// ─── Topic / Session definitions ────────────────────────────────────────────
const TOPICS = [
    {
        index: 1,
        sessionTitle: 'Topic 1: Daily Life & Routines',
        dir: 'topic-1',
        lessons: [
            { num: '01', title: 'Morning Routine' },
            { num: '02', title: 'Housework & Daily Chores' },
            { num: '03', title: 'Meals & Drinks' },
            { num: '04', title: 'Going to Work / School' },
            { num: '05', title: 'Lunch & Break Time' },
            { num: '06', title: 'Afternoon Activities' },
            { num: '07', title: 'Evening Routine' },
            { num: '08', title: 'Family & Home Life' },
            { num: '09', title: 'Unexpected Situations' },
            { num: '10', title: 'Full Day Summary' },
        ],
    },
    {
        index: 2,
        sessionTitle: 'Topic 2: Work & Study',
        dir: 'topic-2',
        lessons: [
            { num: '01', title: 'At the Office' },
            { num: '02', title: 'Meetings & Presentations' },
            { num: '03', title: 'Tasks & Deadlines' },
            { num: '04', title: 'Working from Home' },
            { num: '05', title: 'School & Classes' },
            { num: '06', title: 'Exams & Results' },
            { num: '07', title: 'Job Interview' },
            { num: '08', title: 'Career Development' },
            { num: '09', title: 'Colleagues & Teamwork' },
            { num: '10', title: 'Work-Life Balance' },
        ],
    },
    {
        index: 3,
        sessionTitle: 'Topic 3: Food, Drinks & Restaurants',
        dir: 'topic-3',
        lessons: [
            { num: '01', title: 'Breakfast Foods' },
            { num: '02', title: 'Lunch & Snacks' },
            { num: '03', title: 'Dinner & Special Meals' },
            { num: '04', title: 'At the Restaurant' },
            { num: '05', title: 'Cooking & Recipes' },
            { num: '06', title: 'Drinks & Beverages' },
            { num: '07', title: 'Street Food & Local Food' },
            { num: '08', title: 'Food Preferences & Allergies' },
            { num: '09', title: 'Ordering & Food Delivery' },
            { num: '10', title: 'Food Culture & Traditions' },
        ],
    },
    {
        index: 4,
        sessionTitle: 'Topic 4: Travel & Transportation',
        dir: 'topic-4',
        lessons: [
            { num: '01', title: 'Planning a Trip' },
            { num: '02', title: 'At the Airport' },
            { num: '03', title: 'On the Plane' },
            { num: '04', title: 'Hotels & Accommodation' },
            { num: '05', title: 'Getting Around' },
            { num: '06', title: 'Tourist Attractions' },
            { num: '07', title: 'Shopping While Traveling' },
            { num: '08', title: 'Travel Problems' },
            { num: '09', title: 'Local Customs & Culture' },
            { num: '10', title: 'Trip Review & Memories' },
        ],
    },
    {
        index: 5,
        sessionTitle: 'Topic 5: Health & Fitness',
        dir: 'topic-5',
        lessons: [
            { num: '01', title: "At the Doctor's" },
            { num: '02', title: 'Common Illnesses' },
            { num: '03', title: 'At the Pharmacy' },
            { num: '04', title: 'Exercise & Gym' },
            { num: '05', title: 'Healthy Eating' },
            { num: '06', title: 'Mental Health' },
            { num: '07', title: 'Sports & Activities' },
            { num: '08', title: 'Body & Physical Description' },
            { num: '09', title: 'Preventive Health' },
            { num: '10', title: 'Health Goals & Lifestyle' },
        ],
    },
    {
        index: 6,
        sessionTitle: 'Topic 6: Hobbies, Entertainment & Relationships',
        dir: 'topic-6',
        lessons: [
            { num: '01', title: 'Hobbies & Free Time' },
            { num: '02', title: 'Music & Movies' },
            { num: '03', title: 'Reading & Books' },
            { num: '04', title: 'Sports & Games' },
            { num: '05', title: 'Travel & Adventure (as a Hobby)' },
            { num: '06', title: 'Friends & Social Life' },
            { num: '07', title: 'Romantic Relationships' },
            { num: '08', title: 'Family Relationships' },
            { num: '09', title: 'Online Entertainment' },
            { num: '10', title: 'Personal Growth & Goals' },
        ],
    },
];

// ─── Helper: delete docs in batches of 500 ───────────────────────────────────
async function deleteDocs(snapshotDocs) {
    for (let i = 0; i < snapshotDocs.length; i += 490) {
        const chunk = snapshotDocs.slice(i, i + 490);
        const b = writeBatch(db);
        chunk.forEach(d => b.delete(d.ref));
        await b.commit();
    }
}

// ─── Find or create course ───────────────────────────────────────────────────
const coursesCol = collection(db, BASE + '/courses');
const coursesSnap = await getDocs(coursesCol);
let COURSE_ID = null;

for (const c of coursesSnap.docs) {
    const t = c.data().title;
    const vi = typeof t === 'string' ? t : (t?.vi || '');
    if (vi === COURSE_TITLE_VI) { COURSE_ID = c.id; break; }
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
} else {
    const newCourseRef = doc(coursesCol);
    COURSE_ID = newCourseRef.id;
    await setDoc(newCourseRef, {
        title:       { vi: COURSE_TITLE_VI, en: 'English Reflexes' },
        description: { vi: 'Luyện phản xạ tiếng Anh theo chủ đề giao tiếp hàng ngày' },
        adminId:     ADMIN_ID,
        videoCount:  0,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
    });
    console.log('Created new course:', COURSE_ID);
}

const courseRef   = doc(db, BASE + '/courses/' + COURSE_ID);
const sessionsCol = collection(db, BASE + '/courses/' + COURSE_ID + '/sessions');

// ─── Process each topic ──────────────────────────────────────────────────────
let totalAdded = 0, totalSkipped = 0;

for (const topic of TOPICS) {
    console.log(`\n── ${topic.sessionTitle} ──`);

    // Create session
    const newSessionRef = doc(sessionsCol);
    await setDoc(newSessionRef, {
        courseId:   COURSE_ID,
        title:      topic.sessionTitle,
        orderIndex: topic.index,
        videoCount: 0,
        parentId:   null,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
    });
    const sessionId  = newSessionRef.id;
    const sessionRef = doc(db, BASE + '/courses/' + COURSE_ID + '/sessions/' + sessionId);
    console.log('  Created session:', sessionId);

    // Add lessons
    for (const lesson of topic.lessons) {
        const lessonTitle = `Lesson ${parseInt(lesson.num)}: ${lesson.title}`;
        const filePath    = `${TOPICS_DIR}/${topic.dir}/lesson-${lesson.num}.md`;

        if (!existsSync(filePath)) {
            console.log(`  MISS  ${filePath}`);
            totalSkipped++;
            continue;
        }

        const content  = readFileSync(filePath, 'utf8');
        const batch    = writeBatch(db);
        const videoRef = doc(collection(db, BASE + '/courses/' + COURSE_ID + '/videos'));

        batch.set(videoRef, {
            courseId:  COURSE_ID,
            sessionId: sessionId,
            title:     { vi: lessonTitle, en: lessonTitle },
            adminId:   ADMIN_ID,
            type:      'text',
            content:   content,
            createdAt: serverTimestamp(),
        });
        batch.update(courseRef,  { videoCount: increment(1), updatedAt: serverTimestamp() });
        batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });

        try {
            await batch.commit();
            console.log(`  OK    ${topic.dir}/lesson-${lesson.num} – ${lesson.title}`);
            totalAdded++;
        } catch (err) {
            console.error(`  FAIL  ${topic.dir}/lesson-${lesson.num}:`, err.message);
        }
    }
}

console.log(`\nDone. Course: ${COURSE_ID}`);
console.log(`Added: ${totalAdded}  Skipped: ${totalSkipped}`);
process.exit(0);
