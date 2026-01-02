import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
    ChevronLeft, List, Loader2, CheckCircle2, Circle, Lock, X, Phone, MessageCircle, ArrowRight, 
    PlayCircle, FileText, HelpCircle, AlertCircle, RefreshCcw, Check, ChevronRight, 
    Volume2, LayoutTemplate, Headphones, Plus, Minus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 
import { useTranslation } from 'react-i18next'; // [i18n]
import { 
    type Course, 
    type Video,
    type BlockQuiz,
    subscribeToCourseDetail, 
    subscribeToVideos,
    subscribeToUserEnrollments, 
    getFirebaseAuth,
    toggleVideoProgress,
    tr_h
} from '../services/firebase';
import { useUserProgress } from '../hooks/useUserProgress';
import type { PageType } from '../App';

interface CourseDetailPageProps {
    courseId: string;
    onNavigate: (page: PageType, courseId?: string | null) => void;
}

// --- SUB COMPONENTS ---

const InlineQuizItem: React.FC<{ quiz: BlockQuiz; index: number }> = ({ quiz, index }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const isCorrect = selected === quiz.correctIndex;

    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
            <p className="font-bold text-gray-800 mb-3 flex items-start">
                <span className="bg-indigo-600 text-white text-xs rounded px-2 py-0.5 mr-2 mt-0.5">
                    {t('detail.quiz.question', { index: index + 1 })}
                </span>
                {quiz.question}
            </p>
            <div className="space-y-2">
                {quiz.answers.map((ans, idx) => {
                    let btnClass = "border-gray-300 hover:bg-gray-100";
                    if (submitted) {
                        if (idx === quiz.correctIndex) btnClass = "bg-green-100 border-green-500 text-green-800";
                        else if (idx === selected && idx !== quiz.correctIndex) btnClass = "bg-red-100 border-red-500 text-red-800";
                        else btnClass = "border-gray-200 opacity-50";
                    } else if (selected === idx) {
                        btnClass = "border-indigo-600 bg-indigo-50 text-indigo-900";
                    }
                    return (
                        <button key={idx} disabled={submitted} onClick={() => setSelected(idx)}
                            className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${btnClass}`}
                        >
                            {ans}
                        </button>
                    );
                })}
            </div>
            {!submitted && selected !== null && (
                <button onClick={() => setSubmitted(true)} className="mt-3 text-xs font-bold uppercase tracking-wider bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                    {t('detail.quiz.check')}
                </button>
            )}
            {submitted && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <p className="font-bold">{isCorrect ? t('detail.quiz.correct') : t('detail.quiz.incorrect')}</p>
                    {quiz.explanation && <p className="mt-1 text-xs opacity-90">{quiz.explanation}</p>}
                </div>
            )}
        </div>
    );
};

const ExpandableImage: React.FC<{ url: string; caption?: string }> = ({ url, caption }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(true); 

    return (
        <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all">
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition border-b border-gray-100 select-none"
            >
                <div className="flex-grow flex justify-center">
                    {caption ? (
                        <span className="text-sm font-bold text-gray-700 text-center">
                            {caption}
                            {!isExpanded && <span className="text-xs text-gray-400 font-normal italic ml-2">({t('detail.image.collapsed')})</span>}
                        </span>
                    ) : (
                        <div 
                            className="group flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity py-1"
                            title={isExpanded ? t('detail.image.collapse_tooltip') : t('detail.image.expand_tooltip')}
                        >
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="12" height="12" viewBox="0 0 24 24" 
                                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                className={`text-gray-400 group-hover:text-indigo-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            >
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </div>
                    )}
                </div>
                <button 
                    type="button"
                    className={`ml-3 p-1.5 rounded-full transition ${
                        isExpanded 
                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' 
                        : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                    }`}
                >
                    {isExpanded ? <Minus size={16} /> : <Plus size={16} />}
                </button>
            </div>
            {isExpanded && (
                <div className="p-2 bg-gray-100 animate-in fade-in slide-in-from-top-1 duration-300">
                    <img 
                        src={url} 
                        alt={caption || 'lesson-img'} 
                        className="w-full h-auto rounded-lg object-contain bg-white border border-gray-200"
                    />
                </div>
            )}
        </div>
    );
};

const AudioBlockItem: React.FC<{ url: string; name: string }> = ({ url, name }) => {
    return (
        <div className="flex items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100 mb-3">
            <div className="bg-indigo-600 p-2 rounded-full text-white mr-3 shadow-sm"><Volume2 size={20} /></div>
            <div className="flex-grow min-w-0 mr-3"><p className="text-sm font-bold text-indigo-900 truncate">{name}</p></div>
            <audio controls className="h-8 w-32 md:w-64" controlsList="nodownload"><source src={url} /></audio>
        </div>
    );
};

// --- QUIZ VIEW ---
interface QuizQuestion { question: string; answers: string[]; correct: number; }
const QuizView: React.FC<{ data: string; title: string; onComplete?: () => void }> = ({ data, title, onComplete }) => {
    const { t } = useTranslation();
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        try {
            if (!data) return;
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
                setQuestions(parsed); setError('');
            } else { setError('Invalid Quiz Data'); }
        } catch (e) { setError('Error loading quiz data.'); }
    }, [data]);

    useEffect(() => { setCurrentQIndex(0); setSelectedAnswers({}); setShowResult(false); setScore(0); }, [data]);

    const handleSelect = (answerIndex: number) => { if (showResult) return; setSelectedAnswers(prev => ({ ...prev, [currentQIndex]: answerIndex })); };
    const handleSubmit = () => {
        let correctCount = 0;
        questions.forEach((q, idx) => { if (selectedAnswers[idx] === q.correct) correctCount++; });
        setScore(correctCount); setShowResult(true);
        if (onComplete) onComplete();
    };

    if (error) return <div className="p-8 text-red-500 flex items-center h-full justify-center"><AlertCircle className="mr-2"/> {error}</div>;
    if (questions.length === 0) return <div className="p-8 text-gray-500 h-full flex items-center justify-center">{t('detail.content_updating')}</div>;

    if (showResult) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="w-full h-full bg-white p-6 md:p-10 flex flex-col items-center justify-center overflow-y-auto">
                <div className="w-full max-w-lg text-center space-y-6">
                    <div className="mb-4 inline-block p-4 bg-indigo-50 rounded-full">{percentage >= 80 ? <CheckCircle2 size={64} className="text-green-500" /> : <AlertCircle size={64} className="text-orange-500" />}</div>
                    <h2 className="text-3xl font-black text-gray-800 uppercase">{t('detail.quiz.result')}</h2>
                    <div className="py-6 border-y border-gray-100">
                        <div className="text-6xl font-black text-indigo-600 mb-2">{score}/{questions.length}</div>
                        <p className="text-gray-500 font-medium">{t('detail.quiz.correct_count', { percent: percentage })}</p>
                    </div>
                    <button onClick={() => { setSelectedAnswers({}); setShowResult(false); setCurrentQIndex(0); setScore(0); }} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase hover:bg-indigo-700 flex items-center justify-center">
                        <RefreshCcw size={20} className="mr-2"/> {t('detail.quiz.retry')}
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQIndex];
    return (
        <div className="w-full h-full bg-white flex flex-col relative">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                <div className="flex items-center text-orange-600 font-bold"><HelpCircle className="mr-2" size={20}/><span className="truncate max-w-[200px]">{title}</span></div>
                <div className="text-xs font-bold bg-white border px-3 py-1 rounded-full text-gray-500">{t('detail.quiz.question', { index: `${currentQIndex + 1}/${questions.length}` })}</div>
            </div>
            <div className="flex-grow p-6 md:p-10 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">{currentQ.question}</h3>
                    <div className="space-y-3">
                        {currentQ.answers.map((ans, idx) => {
                            const isSelected = selectedAnswers[currentQIndex] === idx;
                            return (
                                <button key={idx} onClick={() => handleSelect(idx)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center group ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>{isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</div>
                                    <span className="text-base font-medium">{ans}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center flex-shrink-0">
                <button onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))} disabled={currentQIndex === 0} className="px-4 py-2 text-gray-500 font-bold disabled:opacity-30 hover:bg-gray-100 rounded-lg">{t('detail.quiz.prev')}</button>
                {currentQIndex === questions.length - 1 ? (
                    <button onClick={handleSubmit} disabled={Object.keys(selectedAnswers).length !== questions.length} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-300 flex items-center"><Check size={18} className="mr-2"/> {t('detail.quiz.submit')}</button>
                ) : (
                    <button onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 flex items-center">{t('detail.quiz.next')} <ChevronRight size={18} className="ml-1"/></button>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ courseId, onNavigate }) => {
    const { t } = useTranslation();
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    const [course, setCourse] = useState<Course | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [showContactModal, setShowContactModal] = useState(false);
    
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
    const hasAutoResumed = useRef(false);
    const { completedVideoIds } = useUserProgress(user?.uid, courseId);
    
    useEffect(() => {
        if (!user?.uid) { setEnrolledCourseIds([]); return; }
        const unsub = subscribeToUserEnrollments(user.uid, (enrollments) => { setEnrolledCourseIds(enrollments.map(e => e.courseId)); });
        return () => unsub();
    }, [user?.uid]);

    const isEnrolled = useMemo(() => {
        if (!user) return false;
        return enrolledCourseIds.includes(courseId);
    }, [user, enrolledCourseIds, courseId]);

    const progressPercentage = useMemo(() => {
        if (!course || course.videoCount === 0) return 0;
        return Math.min(Math.round((completedVideoIds.length / course.videoCount) * 100), 100);
    }, [completedVideoIds, course]);

    const handleMarkComplete = async (videoId: string, isCompleted: boolean = true) => {
        if (!user) return;
        await toggleVideoProgress(user.uid, courseId, videoId, isCompleted);
    };

    const handleToggleIcon = async (videoId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isCompleted = completedVideoIds.includes(videoId);
        await handleMarkComplete(videoId, !isCompleted);
    };

    useEffect(() => {
        if (!courseId) return;
        const unsubCourse = subscribeToCourseDetail(courseId, setCourse);
        const unsubVideos = subscribeToVideos(courseId, null, (fetched) => {
            setVideos(fetched);
            setLoading(false);
        });
        return () => { unsubCourse(); unsubVideos(); };
    }, [courseId, selectedVideo]);

    useEffect(() => {
        if (!loading && videos.length > 0 && !hasAutoResumed.current) {
            if (isEnrolled) {
                const nextVideo = videos.find(v => !completedVideoIds.includes(v.id));
                setSelectedVideo(nextVideo || videos[0]);
            } else {
                setSelectedVideo(videos[0]);
            }
            hasAutoResumed.current = true;
        }
    }, [loading, videos, completedVideoIds, isEnrolled]);

    const renderContent = () => {
        if (!selectedVideo) return <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-8 text-center bg-gray-900"><PlayCircle size={48} className="mb-4 opacity-20" /><p className="font-bold uppercase text-xs tracking-widest">{t('detail.select_lesson_msg')}</p></div>;

        if (selectedVideo.type === 'quiz') {
            return <QuizView data={selectedVideo.quizData || '[]'} title={selectedVideo.title} onComplete={() => !completedVideoIds.includes(selectedVideo.id) && handleMarkComplete(selectedVideo.id, true)}/>;
        }

        if (selectedVideo.type === 'custom') {
            const blocks = selectedVideo.blockData || [];
            return (
                <div className="w-full h-full bg-white p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto pb-16">
                        <div className="border-b border-gray-100 pb-6 mb-8"><h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center"><LayoutTemplate className="mr-3 text-purple-600" size={32}/> {selectedVideo.title}</h2><p className="text-gray-500 font-medium text-sm">{t('detail.interactive_lesson')}</p></div>
                        <div className="space-y-12">
                            {blocks.length === 0 && <p className="text-gray-400 italic text-center">{t('detail.content_updating')}</p>}
                            {blocks.map((block) => (
                                <div key={block.id} className="animate-in fade-in duration-500">
                                    <div className="flex items-center space-x-2 mb-4"><div className="w-1.5 h-6 bg-purple-500 rounded-full"></div><h3 className="text-xl font-bold text-gray-900">{block.title}</h3></div>
                                    {block.description && <div className="prose prose-purple prose-lg max-w-none text-gray-700 mb-6"><ReactMarkdown>{block.description}</ReactMarkdown></div>}
                                    {block.audios && block.audios.length > 0 && <div className="space-y-2 mb-6">{block.audios.map(audio => <AudioBlockItem key={audio.id} url={audio.url} name={audio.name} />)}</div>}
                                    {block.images && block.images.length > 0 && <div className="grid grid-cols-1 gap-6 mb-6">{block.images.map(img => <ExpandableImage key={img.id} url={img.url} caption={img.caption} />)}</div>}
                                    {block.quizzes && block.quizzes.length > 0 && <div className="mt-6 border-t border-dashed pt-6">{block.quizzes.map((q, idx) => <InlineQuizItem key={q.id} quiz={q} index={idx} />)}</div>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-16 pt-8 border-t border-gray-100 flex justify-center"><button onClick={() => handleMarkComplete(selectedVideo.id, true)} disabled={completedVideoIds.includes(selectedVideo.id)} className={`px-8 py-3 rounded-full font-bold transition flex items-center ${completedVideoIds.includes(selectedVideo.id) ? 'bg-green-100 text-green-700 cursor-default' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'}`}>{completedVideoIds.includes(selectedVideo.id) ? <><CheckCircle2 className="mr-2"/> {t('detail.completed')}</> : <><Check className="mr-2"/> {t('detail.mark_complete')}</>}</button></div>
                    </div>
                </div>
            );
        }

        if (selectedVideo.type === 'audio') {
            return (
                <div className="w-full h-full bg-white p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto pb-10">
                        <div className="border-b border-gray-100 pb-6 mb-8"><h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center"><Headphones className="mr-3 text-purple-600" size={32}/> {selectedVideo.title}</h2><p className="text-gray-500 font-medium text-sm">{t('detail.audio_lesson')}</p></div>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8 flex flex-col items-center justify-center"><div className="w-full max-w-md"><audio controls className="w-full" controlsList="nodownload"><source src={selectedVideo.audioUrl} type="audio/mpeg" /></audio></div></div>
                        {selectedVideo.content && <div className="prose prose-lg prose-indigo max-w-none text-gray-700 leading-relaxed"><h3 className="text-lg font-bold uppercase text-gray-400 text-xs tracking-widest mb-4">Nội dung chi tiết</h3><ReactMarkdown>{selectedVideo.content}</ReactMarkdown></div>}
                        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center"><button onClick={() => handleMarkComplete(selectedVideo.id, true)} disabled={completedVideoIds.includes(selectedVideo.id)} className={`px-8 py-3 rounded-full font-bold transition flex items-center ${completedVideoIds.includes(selectedVideo.id) ? 'bg-green-100 text-green-700 cursor-default' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'}`}>{completedVideoIds.includes(selectedVideo.id) ? <><CheckCircle2 className="mr-2"/> {t('detail.completed')}</> : <><Check className="mr-2"/> {t('detail.mark_complete')}</>}</button></div>
                    </div>
                </div>
            );
        }

        if (selectedVideo.type === 'text') {
            return (
                <div className="w-full h-full bg-white p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto pb-10">
                        <div className="border-b border-gray-100 pb-6 mb-8"><h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center"><FileText className="mr-3 text-indigo-600" size={32}/> {selectedVideo.title}</h2><p className="text-gray-500 font-medium text-sm">{t('detail.theory_lesson')}</p></div>
                        <div className="prose prose-lg prose-indigo max-w-none text-gray-700 leading-relaxed"><ReactMarkdown>{selectedVideo.content || t('detail.content_updating')}</ReactMarkdown></div>
                        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center"><button onClick={() => handleMarkComplete(selectedVideo.id, true)} disabled={completedVideoIds.includes(selectedVideo.id)} className={`px-8 py-3 rounded-full font-bold transition flex items-center ${completedVideoIds.includes(selectedVideo.id) ? 'bg-green-100 text-green-700 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'}`}>{completedVideoIds.includes(selectedVideo.id) ? <><CheckCircle2 className="mr-2"/> {t('detail.completed')}</> : <><Check className="mr-2"/> {t('detail.mark_complete')}</>}</button></div>
                    </div>
                </div>
            );
        }

        return <iframe src={selectedVideo.videoUrl} title={selectedVideo.title} className="w-full h-full" allowFullScreen key={selectedVideo.id} />;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

    const isVideoType = !selectedVideo || !selectedVideo.type || selectedVideo.type === 'video';
    const contentContainerClass = isVideoType ? "aspect-video bg-gray-900" : "h-[600px] bg-white border-b lg:border-none"; 

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => onNavigate(user && isEnrolled ? 'home' : 'landing')} className="flex items-center text-gray-500 font-bold hover:text-indigo-600 transition text-sm uppercase tracking-tighter"><ChevronLeft size={18} className="mr-1"/> {t('detail.back')}</button>
                    {isEnrolled && <div className="flex items-center space-x-3 bg-indigo-50 p-2 px-4 rounded-full border border-indigo-100"><div className="bg-gray-200 rounded-full h-1.5 w-24 overflow-hidden"><div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${progressPercentage}%` }} /></div><span className="text-[10px] font-black text-indigo-700 uppercase">{t('detail.completed_percent', { percent: progressPercentage })}</span></div>}
                </div>
            </header>

            <main className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className={`rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-gray-100 w-full ${contentContainerClass}`}>
                        {!isEnrolled ? (
                            <div className="w-full h-full relative bg-gray-900">
                                <img src={course?.imageUrl} className="w-full h-full object-cover opacity-20 blur-sm" alt="guest-view" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-6">
                                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20"><Lock size={40} className="text-white" /></div>
                                    <div className="max-w-sm"><h3 className="text-white text-2xl font-black mb-2 uppercase tracking-tight">{t('detail.locked_title')}</h3><p className="text-gray-300 text-sm mb-8 font-medium">{t('detail.locked_desc')}</p><button onClick={() => user ? setShowContactModal(true) : onNavigate('login')} className="bg-indigo-600 text-white w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition">{user ? t('detail.contact_admin_btn') : t('detail.login_register_btn')}</button></div>
                                </div>
                            </div>
                        ) : renderContent()}
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2"><div className="h-8 w-1.5 bg-indigo-600 rounded-full"></div><h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight">{tr_h(selectedVideo?.title) || tr_h(course?.title)}</h2></div>
                        <div className="flex items-center space-x-4">
                             {selectedVideo && completedVideoIds.includes(selectedVideo.id) && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center"><CheckCircle2 size={12} className="mr-1" /> {t('detail.completed')}</span>}
                             <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{t('detail.lesson_counter', { current: videos.findIndex(v => v.id === selectedVideo?.id) + 1, total: videos.length })}</span>
                             {selectedVideo?.type && selectedVideo.type !== 'video' && <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded text-white ${selectedVideo.type === 'quiz' ? 'bg-orange-400' : selectedVideo.type === 'text' ? 'bg-blue-400' : selectedVideo.type === 'audio' ? 'bg-purple-400' : 'bg-pink-400'}`}>{selectedVideo.type === 'custom' ? 'Interactive' : selectedVideo.type}</span>}
                        </div>
                        <div className="prose prose-indigo prose-lg text-gray-500 font-medium pt-2 max-w-none"><ReactMarkdown>{tr_h(course?.description) || ""}</ReactMarkdown></div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden flex flex-col shadow-sm max-h-[calc(100vh-160px)] sticky top-24">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between flex-shrink-0"><h3 className="font-black text-gray-800 text-[10px] uppercase tracking-widest flex items-center"><List size={16} className="mr-2 text-indigo-600"/> {t('detail.roadmap')}</h3><span className="text-[10px] font-black text-gray-400 uppercase">{videos.length} {t('landing.lessons')}</span></div>
                        
                        <div className="overflow-y-auto flex-grow p-4 space-y-2 custom-scrollbar">
                            {videos.map((video) => {
                                const isDone = completedVideoIds.includes(video.id);
                                const isActive = selectedVideo?.id === video.id;
                                const isLocked = !isEnrolled;

                                return (
                                    <div 
                                        key={video.id}
                                        onClick={() => !isLocked && setSelectedVideo(video)}
                                        className={`group p-3 rounded-lg flex items-center justify-between transition-all border-l-4 ${
                                            isActive ? 'bg-indigo-50 border-indigo-600' : 
                                            isLocked ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' : 'hover:bg-gray-50 border-transparent cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div onClick={(e) => { if (isLocked) return; handleToggleIcon(video.id, e); }} className={isLocked ? "pointer-events-none" : "cursor-pointer"}>
                                                {isLocked ? <Lock size={16} className="text-gray-400" /> : isDone ? <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" /> : <Circle size={20} className="text-gray-300 group-hover:text-indigo-400 flex-shrink-0" />}
                                            </div>
                                            <span className={`text-sm truncate ${isActive ? 'font-bold text-indigo-900' : 'text-gray-700'}`}>{video.title}</span>
                                        </div>
                                        {video.type === 'quiz' ? <HelpCircle size={16} className={`flex-shrink-0 ${isActive ? 'text-orange-600' : 'text-orange-300'}`} /> : video.type === 'text' ? <FileText size={16} className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-300'}`} /> : video.type === 'custom' ? <LayoutTemplate size={16} className={`flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-purple-300'}`} /> : video.type === 'audio' ? <Headphones size={16} className={`flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-purple-300'}`} /> : <PlayCircle size={16} className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            {showContactModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="bg-indigo-600 p-8 text-white relative">
                            <button onClick={() => setShowContactModal(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{t('detail.register_modal_title')}</h3>
                            <p className="text-indigo-100 text-sm italic leading-relaxed">{t('detail.register_modal_desc')}</p>
                        </div>
                        <div className="p-8 space-y-4">
                            <a href="tel:0901234567" className="flex items-center p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 group"><div className="bg-indigo-600 p-3 rounded-xl text-white mr-4"><Phone size={20} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hotline / Zalo</p><p className="text-lg font-black text-gray-900">090 123 4567</p></div><ArrowRight className="ml-auto text-gray-300 group-hover:text-indigo-600 transition-transform" size={20} /></a>
                            <a href="https://t.me/admin_id" target="_blank" className="flex items-center p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 group"><div className="bg-blue-500 p-3 rounded-xl text-white mr-4"><MessageCircle size={20} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegram</p><p className="text-lg font-black text-gray-900">@admin_videohub</p></div><ArrowRight className="ml-auto text-gray-300 group-hover:text-blue-500 transition-transform" size={20} /></a>
                            <button onClick={() => setShowContactModal(false)} className="w-full py-4 mt-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">{t('detail.close')}</button>
                        </div>
                    </div>
                </div>
            )}
            <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <p>© 2025 {t('footer.slogan')}</p>
            </footer>
        </div>
    );
};

export default CourseDetailPage;