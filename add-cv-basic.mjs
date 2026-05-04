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
const db = getFirestore(app); const auth = getAuth(app);
const email = process.argv[2]; const password = process.argv[3];
if (!email || !password) { console.error('Usage: node add-cv-basic.mjs <email> <password>'); process.exit(1); }
let userCred;
try { userCred = await signInWithEmailAndPassword(auth, email, password); console.log('Signed in:', userCred.user.uid); }
catch (err) { console.error('Login failed:', err.message); process.exit(1); }

const COURSE_ID = 'bgvCsA1i2rNpaYnKJBdA';
const ADMIN_ID  = userCred.user.uid;
const BASE      = 'artifacts/video-hub-prod-id/public/data';
const ROOT_DIR  = 'C:/Users/LongTM4/Documents/vision-ai/vision-ai-course';

// Session IDs (already created in Firebase)
const SESSION_IDS = {
    nhom1: 'SqX19M77k5qJI7xvAw2a',  // Group1-image-understanding
    nhom2: '5WZUhStIkAoiGfQgTwKR',  // Group2-video-understanding
    nhom3: 'P0EUt3bp1Os2yAlxRBeB',  // Group-3-3d-vision
    nhom4: '8WnLIcXqXwAXFlKylEoG',  // Group4-matching-retrieval
    nhom5: '38X4R51k4xP6keoVPg7D',  // Group-5-generative-enhancement
    nhom6: 'ZukXEpCa6b9APUYZdpzS',  // Group-6-multimodal-foundation
};

const LESSONS = [
    // Nhom 1: Image Understanding
    { key: 'nhom1', uuid: 'cv000001-0101-4000-8000-000000000101', title: 'Bài 1.1: Image Classification',     file: 'lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.1-image-classification.md' },
    { key: 'nhom1', uuid: 'cv000001-0102-4000-8000-000000000102', title: 'Bài 1.2: Object Detection',         file: 'lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.2-object-detection.md' },
    { key: 'nhom1', uuid: 'cv000001-0103-4000-8000-000000000103', title: 'Bài 1.3: Semantic Segmentation',    file: 'lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.3-semantic-segmentation.md' },
    { key: 'nhom1', uuid: 'cv000001-0104-4000-8000-000000000104', title: 'Bài 1.4: Instance Segmentation',   file: 'lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.4-instance-segmentation.md' },
    { key: 'nhom1', uuid: 'cv000001-0105-4000-8000-000000000105', title: 'Bài 1.5: Pose Estimation',          file: 'lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.5-pose-estimation.md' },
    { key: 'nhom1', uuid: 'cv000001-0106-4000-8000-000000000106', title: 'Bài 1.6: OCR / Scene Text',         file: 'lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.6-ocr.md' },
    // Nhom 2: Video Understanding
    { key: 'nhom2', uuid: 'cv000001-0201-4000-8000-000000000201', title: 'Bài 2.1: Object Tracking',          file: 'lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.1-object-tracking.md' },
    { key: 'nhom2', uuid: 'cv000001-0202-4000-8000-000000000202', title: 'Bài 2.2: Optical Flow',             file: 'lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.2-optical-flow.md' },
    { key: 'nhom2', uuid: 'cv000001-0203-4000-8000-000000000203', title: 'Bài 2.3: Action Recognition',       file: 'lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.3-action-recognition.md' },
    { key: 'nhom2', uuid: 'cv000001-0204-4000-8000-000000000204', title: 'Bài 2.4: Anomaly Detection',        file: 'lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.4-anomaly-detection.md' },
    // Nhom 3: 3D Vision & Geometry
    { key: 'nhom3', uuid: 'cv000001-0301-4000-8000-000000000301', title: 'Bài 3.1: Camera Calibration',       file: 'lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.1-camera-calibration.md' },
    { key: 'nhom3', uuid: 'cv000001-0302-4000-8000-000000000302', title: 'Bài 3.2: Stereo Depth',             file: 'lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.2-stereo-depth.md' },
    { key: 'nhom3', uuid: 'cv000001-0303-4000-8000-000000000303', title: 'Bài 3.3: Point Cloud',              file: 'lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.3-point-cloud.md' },
    { key: 'nhom3', uuid: 'cv000001-0304-4000-8000-000000000304', title: 'Bài 3.4: Sensor Fusion',            file: 'lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.4-sensor-fusion.md' },
    { key: 'nhom3', uuid: 'cv000001-0305-4000-8000-000000000305', title: 'Bài 3.5: SLAM',                     file: 'lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.5-slam.md' },
    // Nhom 4: Matching & Retrieval
    { key: 'nhom4', uuid: 'cv000001-0401-4000-8000-000000000401', title: 'Bài 4.1: Feature Matching',         file: 'lo-trinh-1-foundation/nhom-4-matching-retrieval/bai-4.1-feature-matching.md' },
    { key: 'nhom4', uuid: 'cv000001-0402-4000-8000-000000000402', title: 'Bài 4.2: Image Retrieval',          file: 'lo-trinh-1-foundation/nhom-4-matching-retrieval/bai-4.2-image-retrieval.md' },
    { key: 'nhom4', uuid: 'cv000001-0403-4000-8000-000000000403', title: 'Bài 4.3: Face Re-ID',               file: 'lo-trinh-1-foundation/nhom-4-matching-retrieval/bai-4.3-face-reid.md' },
    // Nhom 5: Generative & Enhancement
    { key: 'nhom5', uuid: 'cv000001-0501-4000-8000-000000000501', title: 'Bài 5.1: Super-Resolution',         file: 'lo-trinh-3-industrial-medical/nhom-5-generative-enhancement/bai-5.1-super-resolution.md' },
    { key: 'nhom5', uuid: 'cv000001-0502-4000-8000-000000000502', title: 'Bài 5.2: Denoising',                file: 'lo-trinh-3-industrial-medical/nhom-5-generative-enhancement/bai-5.2-denoising.md' },
    { key: 'nhom5', uuid: 'cv000001-0503-4000-8000-000000000503', title: 'Bài 5.3: Inpainting',               file: 'lo-trinh-3-industrial-medical/nhom-5-generative-enhancement/bai-5.3-inpainting.md' },
    // Nhom 6: Multimodal & Foundation
    { key: 'nhom6', uuid: 'cv000001-0601-4000-8000-000000000601', title: 'Bài 6.1: CLIP',                     file: 'lo-trinh-3-industrial-medical/nhom-6-multimodal-foundation/bai-6.1-clip.md' },
    { key: 'nhom6', uuid: 'cv000001-0602-4000-8000-000000000602', title: 'Bài 6.2: SAM',                      file: 'lo-trinh-3-industrial-medical/nhom-6-multimodal-foundation/bai-6.2-sam.md' },
    { key: 'nhom6', uuid: 'cv000001-0603-4000-8000-000000000603', title: 'Bài 6.3: Few-Shot Learning',         file: 'lo-trinh-3-industrial-medical/nhom-6-multimodal-foundation/bai-6.3-few-shot.md' },
];

const courseRef    = doc(db, BASE + '/courses/' + COURSE_ID);
const existingSnap = await getDocs(collection(db, BASE + '/courses/' + COURSE_ID + '/videos'));
const existingIds    = new Set(existingSnap.docs.map(d => d.id));
const existingTitles = new Set(existingSnap.docs.map(d => { const t = d.data().title; return typeof t === 'string' ? t : (t?.vi || ''); }));

let added = 0, skipped = 0;
for (const lesson of LESSONS) {
    if (existingIds.has(lesson.uuid) || existingTitles.has(lesson.title)) { console.log('  SKIP  ' + lesson.title); skipped++; continue; }
    const fp = ROOT_DIR + '/' + lesson.file;
    if (!existsSync(fp)) { console.log('  MISS  ' + fp); skipped++; continue; }
    const content = readFileSync(fp, 'utf8');
    const sid = SESSION_IDS[lesson.key];
    const sessionRef = doc(db, BASE + '/courses/' + COURSE_ID + '/sessions/' + sid);
    const batch = writeBatch(db);
    batch.set(doc(db, BASE + '/courses/' + COURSE_ID + '/videos/' + lesson.uuid), {
        courseId: COURSE_ID, sessionId: sid,
        title: { vi: lesson.title },
        adminId: ADMIN_ID, createdAt: serverTimestamp(), type: 'text', content
    });
    batch.update(courseRef,  { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    try { await batch.commit(); console.log('  OK    ' + lesson.title); added++; }
    catch (err) { console.error('  FAIL  ' + lesson.title + ':', err.message); }
}
console.log('\nDone. Added: ' + added + '  Skipped: ' + skipped);
process.exit(0);