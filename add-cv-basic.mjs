/**
 * add-cv-basic.mjs  (v2)
 *
 * C?u truc session:
 *   Foundation (parent)
 *     Group 1: Image Understanding
 *     Group 2: Video Understanding
 *     Group 4: Matching & Retrieval
 *   ADAS & Robotics (parent)
 *     Group 3: 3D Vision & Geometry
 *   Industrial & Medical (parent)
 *     Group 5: Generative & Enhancement
 *     Group 6: Multimodal & Foundation
 *
 * Usage: node add-cv-basic.mjs <email> <password> [--dry-run]
 * B??c 1: Xoa toan b? data c?
 * B??c 2: T?o sessions theo ?ung c?u truc
 * B??c 3: Add bai h?c vao ?ung session con
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch, collection, getDocs, deleteDoc, increment, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { readFileSync, existsSync } from "fs";

const app = initializeApp({
    apiKey: "AIzaSyBhG9ccu-wsSrTDm6S_Fz2HtYWn_DDE-h8",
    projectId: "video-hub-1",
    storageBucket: "video-hub-1.firebasestorage.app",
    appId: "1:165232200741:web:d34258d29e98f52d7c83cc",
});
const db = getFirestore(app);
const auth = getAuth(app);

const email = process.argv[2];
const password = process.argv[3];
const DRY_RUN = process.argv.includes("--dry-run");

if (!email || !password) { console.error("Usage: node add-cv-basic.mjs <email> <password> [--dry-run]"); process.exit(1); }
if (DRY_RUN) console.log("DRY RUN");

let userCred;
try { userCred = await signInWithEmailAndPassword(auth, email, password); console.log("Signed in:", userCred.user.uid); }
catch (err) { console.error("Login failed:", err.message); process.exit(1); }

const COURSE_ID = "bgvCsA1i2rNpaYnKJBdA";
const ADMIN_ID = userCred.user.uid;
const BASE = "artifacts/video-hub-prod-id/public/data";
const ROOT_DIR = "C:/Users/LongTM4/Documents/vision-ai/vision-ai-course";
const courseRef = doc(db, `${BASE}/courses/${COURSE_ID}`);
const sessionsCol = collection(db, `${BASE}/courses/${COURSE_ID}/sessions`);
const videosCol = collection(db, `${BASE}/courses/${COURSE_ID}/videos`);

// B??C 1: XOA DATA C?
console.log("\n== B??c 1: Xoa data c? ==");
const oldVideos = await getDocs(videosCol);
const oldSessions = await getDocs(sessionsCol);
if (DRY_RUN) {
    console.log(`  [DRY] S? xoa ${oldVideos.size} videos, ${oldSessions.size} sessions`);
} else {
    const vDocs = oldVideos.docs;
    for (let i = 0; i < vDocs.length; i += 490) {
        const b = writeBatch(db);
        vDocs.slice(i, i + 490).forEach(d => b.delete(doc(db, `${BASE}/courses/${COURSE_ID}/videos/${d.id}`)));
        await b.commit();
    }
    for (const s of oldSessions.docs) await deleteDoc(doc(db, `${BASE}/courses/${COURSE_ID}/sessions/${s.id}`));
    const rb = writeBatch(db);
    rb.update(courseRef, { videoCount: 0, updatedAt: serverTimestamp() });
    await rb.commit();
    console.log(`  Xoa ${oldVideos.size} videos, ${oldSessions.size} sessions. videoCount=0`);
}

// B??C 2: T?O SESSIONS
console.log("\n== B??c 2: T?o sessions ==");
const PARENT_DEFS = [
    { key: "foundation",         title: "Foundation",          order: 1 },
    { key: "adas-robotics",      title: "ADAS & Robotics",     order: 2 },
    { key: "industrial-medical", title: "Industrial & Medical", order: 3 },
];
const CHILD_DEFS = [
    { key: "nhom1", parentKey: "foundation",         title: "Group 1: Image Understanding",     order: 1 },
    { key: "nhom2", parentKey: "foundation",         title: "Group 2: Video Understanding",     order: 2 },
    { key: "nhom4", parentKey: "foundation",         title: "Group 4: Matching & Retrieval",    order: 3 },
    { key: "nhom3", parentKey: "adas-robotics",      title: "Group 3: 3D Vision & Geometry",    order: 1 },
    { key: "nhom5", parentKey: "industrial-medical", title: "Group 5: Generative & Enhancement", order: 1 },
    { key: "nhom6", parentKey: "industrial-medical", title: "Group 6: Multimodal & Foundation",  order: 2 },
];
const sessionIds = {};

if (DRY_RUN) {
    PARENT_DEFS.forEach(p => console.log(`  [DRY] Parent: "${p.title}"`));
    CHILD_DEFS.forEach(c => console.log(`  [DRY] Child: "${c.title}" -> parent "${c.parentKey}"`));
} else {
    for (const p of PARENT_DEFS) {
        const r = doc(sessionsCol);
        const b = writeBatch(db);
        b.set(r, { courseId: COURSE_ID, title: p.title, orderIndex: p.order, videoCount: 0, parentId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        await b.commit();
        sessionIds[p.key] = r.id;
        console.log(`  Parent "${p.title}" -> ${r.id}`);
    }
    for (const c of CHILD_DEFS) {
        const r = doc(sessionsCol);
        const b = writeBatch(db);
        b.set(r, { courseId: COURSE_ID, title: c.title, orderIndex: c.order, videoCount: 0, parentId: sessionIds[c.parentKey], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        await b.commit();
        sessionIds[c.key] = r.id;
        console.log(`  Child  "${c.title}" -> ${r.id}  (parent: ${sessionIds[c.parentKey]})`);
    }
}

// B??C 3: ADD BAI H?C
console.log("\n== B??c 3: Add bai h?c ==");
const LESSONS = [
    { key: "nhom1", uuid: "cv000001-0101-4000-8000-000000000101", title: "Bai 1.1: Image Classification",   file: "lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.1-image-classification.md" },
    { key: "nhom1", uuid: "cv000001-0102-4000-8000-000000000102", title: "Bai 1.2: Object Detection",       file: "lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.2-object-detection.md" },
    { key: "nhom1", uuid: "cv000001-0103-4000-8000-000000000103", title: "Bai 1.3: Semantic Segmentation",  file: "lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.3-semantic-segmentation.md" },
    { key: "nhom1", uuid: "cv000001-0104-4000-8000-000000000104", title: "Bai 1.4: Instance Segmentation",  file: "lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.4-instance-segmentation.md" },
    { key: "nhom1", uuid: "cv000001-0105-4000-8000-000000000105", title: "Bai 1.5: Pose Estimation",        file: "lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.5-pose-estimation.md" },
    { key: "nhom1", uuid: "cv000001-0106-4000-8000-000000000106", title: "Bai 1.6: OCR / Scene Text",       file: "lo-trinh-1-foundation/nhom-1-image-understanding/bai-1.6-ocr.md" },
    { key: "nhom2", uuid: "cv000001-0201-4000-8000-000000000201", title: "Bai 2.1: Object Tracking",        file: "lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.1-object-tracking.md" },
    { key: "nhom2", uuid: "cv000001-0202-4000-8000-000000000202", title: "Bai 2.2: Optical Flow",           file: "lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.2-optical-flow.md" },
    { key: "nhom2", uuid: "cv000001-0203-4000-8000-000000000203", title: "Bai 2.3: Action Recognition",     file: "lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.3-action-recognition.md" },
    { key: "nhom2", uuid: "cv000001-0204-4000-8000-000000000204", title: "Bai 2.4: Anomaly Detection",      file: "lo-trinh-1-foundation/nhom-2-video-understanding/bai-2.4-anomaly-detection.md" },
    { key: "nhom4", uuid: "cv000001-0401-4000-8000-000000000401", title: "Bai 4.1: Feature Matching",       file: "lo-trinh-1-foundation/nhom-4-matching-retrieval/bai-4.1-feature-matching.md" },
    { key: "nhom4", uuid: "cv000001-0402-4000-8000-000000000402", title: "Bai 4.2: Image Retrieval",        file: "lo-trinh-1-foundation/nhom-4-matching-retrieval/bai-4.2-image-retrieval.md" },
    { key: "nhom4", uuid: "cv000001-0403-4000-8000-000000000403", title: "Bai 4.3: Face Re-ID",             file: "lo-trinh-1-foundation/nhom-4-matching-retrieval/bai-4.3-face-reid.md" },
    { key: "nhom3", uuid: "cv000001-0301-4000-8000-000000000301", title: "Bai 3.1: Camera Calibration",     file: "lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.1-camera-calibration.md" },
    { key: "nhom3", uuid: "cv000001-0302-4000-8000-000000000302", title: "Bai 3.2: Stereo Depth",           file: "lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.2-stereo-depth.md" },
    { key: "nhom3", uuid: "cv000001-0303-4000-8000-000000000303", title: "Bai 3.3: Point Cloud",            file: "lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.3-point-cloud.md" },
    { key: "nhom3", uuid: "cv000001-0304-4000-8000-000000000304", title: "Bai 3.4: Sensor Fusion",          file: "lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.4-sensor-fusion.md" },
    { key: "nhom3", uuid: "cv000001-0305-4000-8000-000000000305", title: "Bai 3.5: SLAM",                   file: "lo-trinh-2-adas-robotics/nhom-3-3d-vision/bai-3.5-slam.md" },
    { key: "nhom5", uuid: "cv000001-0501-4000-8000-000000000501", title: "Bai 5.1: Super-Resolution",       file: "lo-trinh-3-industrial-medical/nhom-5-generative-enhancement/bai-5.1-super-resolution.md" },
    { key: "nhom5", uuid: "cv000001-0502-4000-8000-000000000502", title: "Bai 5.2: Denoising",              file: "lo-trinh-3-industrial-medical/nhom-5-generative-enhancement/bai-5.2-denoising.md" },
    { key: "nhom5", uuid: "cv000001-0503-4000-8000-000000000503", title: "Bai 5.3: Inpainting",             file: "lo-trinh-3-industrial-medical/nhom-5-generative-enhancement/bai-5.3-inpainting.md" },
    { key: "nhom6", uuid: "cv000001-0601-4000-8000-000000000601", title: "Bai 6.1: CLIP",                   file: "lo-trinh-3-industrial-medical/nhom-6-multimodal-foundation/bai-6.1-clip.md" },
    { key: "nhom6", uuid: "cv000001-0602-4000-8000-000000000602", title: "Bai 6.2: SAM",                    file: "lo-trinh-3-industrial-medical/nhom-6-multimodal-foundation/bai-6.2-sam.md" },
    { key: "nhom6", uuid: "cv000001-0603-4000-8000-000000000603", title: "Bai 6.3: Few-Shot Learning",      file: "lo-trinh-3-industrial-medical/nhom-6-multimodal-foundation/bai-6.3-few-shot.md" },
];

let added = 0, missed = 0;
for (const lesson of LESSONS) {
    const fp = `${ROOT_DIR}/${lesson.file}`;
    if (!existsSync(fp)) { console.log(`  MISS  ${lesson.file}`); missed++; continue; }
    const sid = sessionIds[lesson.key];
    const content = readFileSync(fp, "utf8");
    if (DRY_RUN) { console.log(`  [DRY] ${lesson.title} -> session key=${lesson.key}`); added++; continue; }
    if (!sid) { console.log(`  NO SESSION for key=${lesson.key}`); missed++; continue; }
    const sessionRef = doc(db, `${BASE}/courses/${COURSE_ID}/sessions/${sid}`);
    const batch = writeBatch(db);
    batch.set(doc(db, `${BASE}/courses/${COURSE_ID}/videos/${lesson.uuid}`), { courseId: COURSE_ID, sessionId: sid, title: { vi: lesson.title }, adminId: ADMIN_ID, createdAt: serverTimestamp(), type: "text", content });
    batch.update(courseRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    batch.update(sessionRef, { videoCount: increment(1), updatedAt: serverTimestamp() });
    try { await batch.commit(); console.log(`  OK  ${lesson.title}`); added++; }
    catch (err) { console.error(`  FAIL ${lesson.title}:`, err.message); }
}

console.log(`\nDone${DRY_RUN ? " (DRY RUN)" : ""}. Added: ${added}  Missed: ${missed}`);
process.exit(0);
