// Re-export everything for easy access
export * from './config';
export * from './auth';
export * from './courses';
export * from './sessions';
export * from './videos';
export * from './enrollments';
export * from './progress';
export * from './i18nHelper';

// Ngoài ra, để tương thích với code cũ, ta có thể export các alias nếu cần
import { getFirebaseStorage } from './config';
export const storage = getFirebaseStorage();