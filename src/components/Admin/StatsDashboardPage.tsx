import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Users, BookOpen, Activity, Award, Copy, CheckCheck,
    RefreshCw, BarChart2, TrendingUp, Clock, UserCheck
} from 'lucide-react';
import { subscribeToAppUsers, type AppUser } from '../../services/firebase/auth';
import { subscribeToCourses, type Course } from '../../services/firebase/courses';
import { subscribeToAllEnrollments, fetchUserProgressCount } from '../../services/firebase/stats';
import { tr_h } from '../../services/firebase/i18nHelper';
import type { Enrollment } from '../../services/firebase/enrollments';

// --- SUB COMPONENTS ---

const SummaryCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    colorClass: string;
}> = ({ icon, label, value, sub, colorClass }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

const BarItem: React.FC<{
    label: string;
    value: number;
    max: number;
    colorClass: string;
}> = ({ label, value, max, colorClass }) => (
    <div className="flex items-center gap-3 mb-3 last:mb-0">
        <span className="w-36 text-sm text-gray-600 truncate flex-shrink-0" title={label}>
            {label}
        </span>
        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
                className={`h-full rounded-full ${colorClass} flex items-center justify-end px-2 transition-all duration-500`}
                style={{ width: `${Math.max(8, max > 0 ? (value / max) * 100 : 0)}%` }}
            >
                <span className="text-white text-xs font-bold drop-shadow">{value}</span>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

interface CourseStatRow {
    course: Course;
    total: number;
    active: number;
    completed: number;
    completionRate: number;
}

interface StudentStatRow {
    user: AppUser;
    totalCompleted: number;
    enrolledCount: number;
}

const StatsDashboardPage: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [userProgressMap, setUserProgressMap] = useState<Record<string, number>>({});
    const [progressLoading, setProgressLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Live subscriptions
    useEffect(() => {
        const unsubUsers = subscribeToAppUsers(setUsers);
        const unsubCourses = subscribeToCourses(setCourses);
        const unsubEnrollments = subscribeToAllEnrollments(setEnrollments);
        return () => {
            unsubUsers();
            unsubCourses();
            unsubEnrollments();
        };
    }, []);

    // Fetch progress for all users
    const fetchProgress = useCallback(async (currentUsers: AppUser[]) => {
        if (currentUsers.length === 0) return;
        setProgressLoading(true);
        try {
            const entries = await Promise.all(
                currentUsers.map(async u => {
                    const count = await fetchUserProgressCount(u.uid);
                    return [u.uid, count] as [string, number];
                })
            );
            setUserProgressMap(Object.fromEntries(entries));
        } catch (err) {
            console.error('Lỗi khi tải tiến độ học viên:', err);
        } finally {
            setProgressLoading(false);
        }
    }, []);

    useEffect(() => {
        if (users.length > 0) {
            fetchProgress(users);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [users.length]);

    // --- DERIVED STATS ---

    // Per-course enrollment stats
    const courseStats = useMemo<Record<string, { total: number; active: number; completed: number }>>(() => {
        const map: Record<string, { total: number; active: number; completed: number }> = {};
        enrollments.forEach(e => {
            if (!map[e.courseId]) map[e.courseId] = { total: 0, active: 0, completed: 0 };
            map[e.courseId].total++;
            if (e.status === 'active') map[e.courseId].active++;
            else if (e.status === 'completed') map[e.courseId].completed++;
        });
        return map;
    }, [enrollments]);

    // Per-user enrollment count
    const userEnrollmentCount = useMemo<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        enrollments.forEach(e => {
            map[e.userId] = (map[e.userId] || 0) + 1;
        });
        return map;
    }, [enrollments]);

    // Summary numbers
    const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
    const totalEnrollments = enrollments.length;
    const totalActive = useMemo(() => enrollments.filter(e => e.status === 'active').length, [enrollments]);
    const totalVideoLessons = useMemo(() => courses.reduce((s, c) => s + (c.videoCount || 0), 0), [courses]);
    const newThisWeek = useMemo(() => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return students.filter(u => u.createdAt > weekAgo).length;
    }, [students]);
    const overallCompletionRate = useMemo(() => {
        if (totalEnrollments === 0) return 0;
        const completed = enrollments.filter(e => e.status === 'completed').length;
        return Math.round((completed / totalEnrollments) * 100);
    }, [enrollments, totalEnrollments]);

    // Top courses by enrollment
    const topByEnrollment = useMemo(() => {
        return courses
            .map(c => ({ course: c, count: courseStats[c.id]?.total || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
    }, [courses, courseStats]);

    // Top courses by active learners (in-progress)
    const topByActive = useMemo(() => {
        return courses
            .map(c => ({ course: c, count: courseStats[c.id]?.active || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
    }, [courses, courseStats]);

    // Full course table (sorted by total enrollment)
    const courseTable = useMemo<CourseStatRow[]>(() => {
        return courses.map(c => {
            const stats = courseStats[c.id] || { total: 0, active: 0, completed: 0 };
            return {
                course: c,
                ...stats,
                completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
            };
        }).sort((a, b) => b.total - a.total);
    }, [courses, courseStats]);

    // Top students by total completed videos
    const topStudents = useMemo<StudentStatRow[]>(() => {
        return students
            .map(u => ({
                user: u,
                totalCompleted: userProgressMap[u.uid] ?? -1,
                enrolledCount: userEnrollmentCount[u.uid] || 0,
            }))
            .sort((a, b) => b.totalCompleted - a.totalCompleted)
            .slice(0, 10);
    }, [students, userProgressMap, userEnrollmentCount]);

    const maxEnrollment = topByEnrollment[0]?.count || 1;
    const maxActive = topByActive[0]?.count || 1;

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id).catch(() => {});
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-8">

            {/* ── SUMMARY CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={<Users size={22} className="text-white" />}
                    label="Tổng học viên"
                    value={students.length}
                    sub={`+${newThisWeek} trong 7 ngày qua`}
                    colorClass="bg-gradient-to-br from-blue-400 to-blue-600"
                />
                <SummaryCard
                    icon={<BookOpen size={22} className="text-white" />}
                    label="Khóa học"
                    value={courses.length}
                    sub={`${totalVideoLessons} bài học tổng`}
                    colorClass="bg-gradient-to-br from-indigo-400 to-indigo-600"
                />
                <SummaryCard
                    icon={<TrendingUp size={22} className="text-white" />}
                    label="Tổng ghi danh"
                    value={totalEnrollments}
                    sub={`${totalActive} đang học`}
                    colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600"
                />
                <SummaryCard
                    icon={<Activity size={22} className="text-white" />}
                    label="Tỉ lệ hoàn thành"
                    value={`${overallCompletionRate}%`}
                    sub={`Trung bình toàn hệ thống`}
                    colorClass="bg-gradient-to-br from-amber-400 to-orange-500"
                />
            </div>

            {/* ── CHARTS ROW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top by total enrollment */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <BarChart2 size={18} className="text-[#1A73E8]" />
                        <h3 className="font-bold text-gray-700">Đăng ký nhiều nhất</h3>
                    </div>
                    {topByEnrollment.length > 0 ? (
                        topByEnrollment.map(({ course, count }) => (
                            <BarItem
                                key={course.id}
                                label={tr_h(course.title)}
                                value={count}
                                max={maxEnrollment}
                                colorClass="bg-gradient-to-r from-blue-400 to-blue-600"
                            />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                    )}
                </div>

                {/* Top by active learners */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Activity size={18} className="text-emerald-500" />
                        <h3 className="font-bold text-gray-700">Đang học nhiều nhất (In-Progress)</h3>
                    </div>
                    {topByActive.length > 0 ? (
                        topByActive.map(({ course, count }) => (
                            <BarItem
                                key={course.id}
                                label={tr_h(course.title)}
                                value={count}
                                max={maxActive}
                                colorClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
                            />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                    )}
                </div>
            </div>

            {/* ── COURSE REFERENCE TABLE ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <BookOpen size={18} className="text-[#1A73E8]" />
                    <h3 className="font-bold text-gray-700">Danh sách khóa học & Course ID</h3>
                    <span className="ml-auto text-xs text-gray-400">{courses.length} khóa học</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                <th className="px-5 py-3 text-left">Tên khóa học</th>
                                <th className="px-5 py-3 text-left">Course ID</th>
                                <th className="px-5 py-3 text-center">Bài học</th>
                                <th className="px-5 py-3 text-center">Ghi danh</th>
                                <th className="px-5 py-3 text-center">Đang học</th>
                                <th className="px-5 py-3 text-center">Hoàn thành</th>
                                <th className="px-5 py-3 text-center">Tỉ lệ HT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {courseTable.map(row => (
                                <tr key={row.course.id} className="hover:bg-gray-50/80 transition">
                                    <td className="px-5 py-3 font-medium text-gray-700 whitespace-nowrap">
                                        {tr_h(row.course.title)}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono select-all">
                                                {row.course.id}
                                            </code>
                                            <button
                                                onClick={() => handleCopy(row.course.id)}
                                                className="text-gray-400 hover:text-[#1A73E8] transition flex-shrink-0"
                                                title="Sao chép ID"
                                            >
                                                {copiedId === row.course.id
                                                    ? <CheckCheck size={14} className="text-emerald-500" />
                                                    : <Copy size={14} />
                                                }
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-center text-gray-500">{row.course.videoCount || 0}</td>
                                    <td className="px-5 py-3 text-center font-semibold text-gray-700">{row.total}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {row.active}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {row.completed}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-14 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-emerald-400"
                                                    style={{ width: `${row.completionRate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 w-8 text-right">{row.completionRate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {courseTable.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-10">Chưa có khóa học nào</p>
                    )}
                </div>
            </div>

            {/* ── TOP STUDENTS TABLE ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award size={18} className="text-amber-500" />
                        <h3 className="font-bold text-gray-700">Top học viên tích cực nhất</h3>
                        <span className="text-xs text-gray-400">(theo số bài đã hoàn thành)</span>
                    </div>
                    <button
                        onClick={() => fetchProgress(users)}
                        disabled={progressLoading || users.length === 0}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A73E8] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={13} className={progressLoading ? 'animate-spin' : ''} />
                        {progressLoading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                <th className="px-5 py-3 text-center w-12">#</th>
                                <th className="px-5 py-3 text-left">Học viên</th>
                                <th className="px-5 py-3 text-left">Email</th>
                                <th className="px-5 py-3 text-center">Bài hoàn thành</th>
                                <th className="px-5 py-3 text-center">Khóa đăng ký</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {topStudents.map((row, idx) => (
                                <tr key={row.user.uid} className="hover:bg-gray-50/80 transition">
                                    <td className="px-5 py-3 text-center">
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                                            <span className="text-gray-400 text-xs font-medium">{idx + 1}</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {(row.user.displayName || row.user.email || '?')[0].toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-700 whitespace-nowrap">
                                                {row.user.displayName || '—'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-gray-500">{row.user.email}</td>
                                    <td className="px-5 py-3 text-center">
                                        {progressLoading && row.totalCompleted < 0 ? (
                                            <span className="inline-block w-8 h-4 bg-gray-100 rounded animate-pulse" />
                                        ) : (
                                            <span className="font-bold text-[#1A73E8]">
                                                {row.totalCompleted < 0 ? '—' : row.totalCompleted}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-center text-gray-600">{row.enrolledCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {topStudents.length === 0 && !progressLoading && (
                        <p className="text-sm text-gray-400 text-center py-10">Chưa có học viên</p>
                    )}
                </div>
            </div>

            {/* ── RECENT STUDENTS ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Clock size={18} className="text-[#1A73E8]" />
                    <h3 className="font-bold text-gray-700">Học viên đăng ký gần đây</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {students.slice(0, 8).map(u => (
                        <div key={u.uid} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/80 transition">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {(u.displayName || u.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700 text-sm leading-tight">{u.displayName || '—'}</p>
                                    <p className="text-xs text-gray-400">{u.email}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-xs text-gray-400">
                                    {new Date(u.createdAt).toLocaleDateString('vi-VN', {
                                        day: '2-digit', month: '2-digit', year: 'numeric'
                                    })}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {userEnrollmentCount[u.uid] || 0} khóa đã đăng ký
                                </p>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">Chưa có học viên nào</p>
                    )}
                </div>
            </div>

            {/* ── ADMIN ACCOUNTS (bonus) ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <UserCheck size={18} className="text-indigo-500" />
                    <h3 className="font-bold text-gray-700">Tài khoản Admin</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {users.filter(u => u.role === 'admin').map(u => (
                        <div key={u.uid} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/80 transition">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(u.displayName || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-gray-700 text-sm">{u.displayName || '—'}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                            <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                                Admin
                            </span>
                        </div>
                    ))}
                    {users.filter(u => u.role === 'admin').length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">Không có admin</p>
                    )}
                </div>
            </div>

        </div>
    );
};

export default StatsDashboardPage;
