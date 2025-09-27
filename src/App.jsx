import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { toast, ToastContainer } from 'react-toastify';

const toastStyles = `
.Toastify__toast-container {
  z-index: 9999;
  position: fixed;
  padding: 4px;
  width: 320px;
  box-sizing: border-box;
  color: #fff;
}
.Toastify__toast-container--top-left {
  top: 1em;
  left: 1em;
}
.Toastify__toast-container--top-center {
  top: 1em;
  left: 50%;
  transform: translateX(-50%);
}
.Toastify__toast-container--top-right {
  top: 1em;
  right: 1em;
}
.Toastify__toast-container--bottom-left {
  bottom: 1em;
  left: 1em;
}
.Toastify__toast-container--bottom-center {
  bottom: 1em;
  left: 50%;
  transform: translateX(-50%);
}
.Toastify__toast-container--bottom-right {
  bottom: 1em;
  right: 1em;
}
.Toastify__toast {
  position: relative;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  font-family: sans-serif;
  cursor: pointer;
  background-color: #fff;
  background-image: none;
  overflow: hidden;
  min-height: 40px;
  color: #000;
}
.Toastify__toast--success {
  background-color: #28a745;
  color: #fff;
}
.Toastify__toast--error {
  background-color: #dc3545;
  color: #fff;
}
.Toastify__toast--info {
  background-color: #17a2b8;
  color: #fff;
}
.Toastify__toast-body {
  display: flex;
  align-items: center;
  flex: 1;
}
@keyframes Toastify__slideInRight {
  from {
    transform: translate3d(110%, 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}
@keyframes Toastify__slideOutRight {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(110%, 0, 0);
  }
}
`;

const LandingPage = ({ onLogin, onRegister }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-6">VideoHub</h1>
            <p className="text-gray-600 mb-8">Nền tảng video nội bộ an toàn và hiện đại.</p>
            <div className="space-y-4">
                <button
                    onClick={onLogin}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-full font-semibold hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 shadow-md"
                >
                    Đăng nhập
                </button>
                <button
                    onClick={onRegister}
                    className="w-full bg-green-500 text-white py-3 px-6 rounded-full font-semibold hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105 shadow-md"
                >
                    Đăng ký
                </button>
            </div>
        </div>
    </div>
);

const LoginPage = ({ onGoToLanding, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const auth = getAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            toast.success("Đăng nhập thành công!");
            onLoginSuccess(userCredential.user);
        } catch (error) {
            toast.error("Đăng nhập thất bại: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Đăng nhập</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-150 ease-in-out shadow-md disabled:bg-gray-400"
                    >
                        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <button onClick={onGoToLanding} className="text-blue-600 hover:underline">
                        Quay lại trang giới thiệu
                    </button>
                </div>
            </div>
        </div>
    );
};

const RegisterPage = ({ onGoToLanding }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const auth = getAuth();

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        if (password !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp.");
            setIsLoading(false);
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
            onGoToLanding();
        } catch (error) {
            toast.error("Đăng ký thất bại: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Đăng ký</h2>
                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-600 transition duration-150 ease-in-out shadow-md disabled:bg-gray-400"
                    >
                        {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <button onClick={onGoToLanding} className="text-blue-600 hover:underline">
                        Quay lại trang giới thiệu
                    </button>
                </div>
            </div>
        </div>
    );
};

const HomePage = ({ user, onSignOut, onGoToCourses }) => {
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const db = getFirestore();
    const storage = getStorage();

    useEffect(() => {
        if (!user) return;

        const videosCollectionRef = collection(db, 'videos');
        const unsubscribe = onSnapshot(videosCollectionRef, (snapshot) => {
            const videosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setVideos(videosData);
        }, (error) => {
            console.error("Error fetching videos:", error);
            toast.error("Lỗi khi tải danh sách video.");
        });

        return () => unsubscribe();
    }, [user, db]);

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Vui lòng chọn một tệp video.");
            return;
        }

        setUploading(true);
        try {
            const videoId = uuidv4();
            const storageRef = ref(storage, `videos/${videoId}-${file.name}`);
            const uploadTask = await uploadBytes(storageRef, file);
            const videoUrl = await getDownloadURL(uploadTask.ref);

            const newVideoRef = doc(db, 'videos', videoId);
            await setDoc(newVideoRef, {
                title: file.name,
                url: videoUrl,
                uploader: user.email,
                uploadedAt: new Date(),
            });

            toast.success("Tải video lên thành công!");
            setFile(null);
        } catch (error) {
            console.error("Lỗi khi tải video lên:", error);
            toast.error("Lỗi khi tải video lên: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 p-4">
            <header className="flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-xl mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Chào mừng, {user.email}</h1>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onGoToCourses}
                        className="bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition duration-150 ease-in-out shadow-md"
                    >
                        Khóa học
                    </button>
                    <button
                        onClick={() => setSelectedVideo(null)}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-150 ease-in-out shadow-md"
                    >
                        Video
                    </button>
                    <button
                        onClick={onSignOut}
                        className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition duration-150 ease-in-out shadow-md"
                    >
                        Đăng xuất
                    </button>
                </div>
            </header>

            {selectedVideo ? (
                <div className="flex flex-col items-center flex-grow p-4">
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">{selectedVideo.title}</h2>
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-4xl">
                        <video controls className="w-full" src={selectedVideo.url}></video>
                    </div>
                    <p className="mt-4 text-gray-600">Đăng bởi: {selectedVideo.uploader}</p>
                </div>
            ) : (
                <div className="flex flex-grow space-x-4">
                    <div className="w-1/3 bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tải lên video</h2>
                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => setFile(e.target.files[0])}
                                required
                                className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-150 ease-in-out shadow-md disabled:bg-gray-400"
                            >
                                {uploading ? 'Đang tải lên...' : 'Tải lên video'}
                            </button>
                        </form>
                    </div>

                    <div className="w-2/3 bg-white p-6 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Video đã tải lên</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {videos.length > 0 ? (
                                videos.map(video => (
                                    <div
                                        key={video.id}
                                        onClick={() => setSelectedVideo(video)}
                                        className="bg-gray-50 rounded-lg shadow-sm p-4 cursor-pointer hover:bg-gray-100 transition duration-150 ease-in-out"
                                    >
                                        <h3 className="font-semibold text-gray-800 truncate">{video.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1">Đăng bởi: {video.uploader}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 col-span-4 text-center">Chưa có video nào được tải lên.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
        </div>
    );
};

const CoursesPage = ({ onGoToHome, user }) => {
    const [courses, setCourses] = useState([]);
    const db = getFirestore();

    useEffect(() => {
        if (!user) return;

        const coursesCollectionRef = collection(db, 'courses');
        const unsubscribe = onSnapshot(coursesCollectionRef, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCourses(coursesData);
        }, (error) => {
            console.error("Error fetching courses:", error);
            toast.error("Lỗi khi tải danh sách khóa học.");
        });

        return () => unsubscribe();
    }, [user, db]);

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 p-4">
            <header className="flex justify-between items-center py-4 px-6 bg-white shadow-md rounded-xl mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Chào mừng, {user.email}</h1>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => onGoToHome('courses')}
                        className="bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition duration-150 ease-in-out shadow-md"
                    >
                        Khóa học
                    </button>
                    <button
                        onClick={() => onGoToHome('home')}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-150 ease-in-out shadow-md"
                    >
                        Video
                    </button>
                    <button
                        onClick={onGoToHome}
                        className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition duration-150 ease-in-out shadow-md"
                    >
                        Đăng xuất
                    </button>
                </div>
            </header>

            <div className="flex flex-col items-center flex-grow p-4">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Khám phá các khóa học</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
                    {courses.length > 0 ? (
                        courses.map(course => (
                            <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition duration-300 ease-in-out transform hover:scale-105">
                                <img src={course.image || 'https://placehold.co/400x200/cccccc/333333?text=Không+có+ảnh'} alt={course.title} className="w-full h-40 object-cover" />
                                <div className="p-6">
                                    <h3 className="font-bold text-xl text-gray-900 mb-2">{course.title}</h3>
                                    <p className="text-gray-600 text-sm">Giảng viên: {course.instructor}</p>
                                    <p className="text-gray-500 text-xs mt-1">Thời lượng: {course.duration}</p>
                                    <button
                                        className="mt-4 w-full bg-indigo-500 text-white py-2 rounded-lg font-semibold hover:bg-indigo-600 transition duration-150 ease-in-out"
                                    >
                                        Xem chi tiết
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 col-span-full text-center">Chưa có khóa học nào được tìm thấy. Vui lòng thêm dữ liệu vào Firestore.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('landing');
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    useEffect(() => {
        console.log("App component: Running useEffect for Firebase initialization.");
        
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is empty. Please check your setup.");
            setIsAuthReady(true);
            return;
        }

        try {
            console.log("Firebase: Initializing app...");
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            getFirestore(app);
            getStorage(app);
            console.log("Firebase: Services initialized.");

            const timeoutId = setTimeout(() => {
                console.log("Timeout triggered after 5 seconds. Forcing auth check completion.");
                setIsAuthReady(true);
            }, 5000);

            console.log("Firebase: Setting up onAuthStateChanged listener.");
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                clearTimeout(timeoutId);
                console.log("Firebase: onAuthStateChanged listener triggered. User:", user ? user.email : "none");
                setUser(user);
                if (user) {
                    setPage('home');
                } else {
                    setPage('landing');
                }
                setIsAuthReady(true);
            });
            
            console.log("Firebase: Attempting to sign in with custom token or anonymously.");
            if (typeof __initial_auth_token !== 'undefined') {
                signInWithCustomToken(auth, __initial_auth_token)
                    .then(() => console.log("Firebase: Signed in with custom token."))
                    .catch(error => console.error("Firebase: Custom token sign-in failed:", error));
            } else {
                signInAnonymously(auth)
                    .then(() => console.log("Firebase: Signed in anonymously."))
                    .catch(error => console.error("Firebase: Anonymous sign-in failed:", error));
            }

            return () => {
                console.log("App component: Cleaning up listener and timeout.");
                unsubscribe();
                clearTimeout(timeoutId);
            };
        } catch (error) {
            console.error("An error occurred during Firebase initialization:", error);
            setIsAuthReady(true);
        }
    }, []);

    const handleSignOut = async () => {
        const auth = getAuth();
        await signOut(auth);
        toast.info("Đã đăng xuất thành công!");
    };
    
    if (!isAuthReady) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-600">
                Đang khởi tạo ứng dụng...
            </div>
        );
    }

    const renderPage = () => {
        if (user) {
            switch (page) {
                case 'home':
                    return <HomePage user={user} onSignOut={handleSignOut} onGoToCourses={() => setPage('courses')} />;
                case 'courses':
                    return <CoursesPage user={user} onGoToHome={() => setPage('home')} />;
                default:
                    return <HomePage user={user} onSignOut={handleSignOut} onGoToCourses={() => setPage('courses')} />;
            }
        } else {
            switch (page) {
                case 'login':
                    return <LoginPage onGoToLanding={() => setPage('landing')} onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
                case 'register':
                    return <RegisterPage onGoToLanding={() => setPage('landing')} />;
                case 'landing':
                default:
                    return <LandingPage onLogin={() => setPage('login')} onRegister={() => setPage('register')} />;
            }
        }
    };

    return (
        <>
            <style>{toastStyles}</style>
            {renderPage()}
            <ToastContainer />
        </>
    );
}

export default App;
