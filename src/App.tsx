import React, { useState } from 'react';
import LandingPage from './pages/LandingPage'; // Đảm bảo import đúng
import RegisterPage from './pages/RegisterPage'; 

// Định nghĩa các loại trang mà ứng dụng có thể hiển thị
type Page = 'landing' | 'login' | 'register' | 'dashboard';

// Component Placeholder cho các trang chưa xây dựng UI
const PlaceholderPage: React.FC<{ name: string, onNavigate: (page: Page) => void }> = ({ name, onNavigate }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
        <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md">
            <h1 className="text-4xl font-extrabold text-yellow-400 mb-4">{name} (Chưa xây dựng UI)</h1>
            <p className="text-gray-400 mb-6">Chúng ta sẽ xây dựng trang này trong các bước tiếp theo.</p>
            <button
                onClick={() => onNavigate('landing')}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition duration-200 text-sm font-semibold"
            >
                Quay lại Trang Chủ
            </button>
        </div>
    </div>
);


const App: React.FC = () => {
    // State quản lý trang hiện tại. Khởi tạo là 'landing'
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    // NOTE: Khi tích hợp Firebase (Task 2), chúng ta sẽ thêm state user/auth vào đây

    const handleNavigate = (page: Page) => {
        setCurrentPage(page);
    };

    const renderPage = () => {
        // Hàm router đơn giản để hiển thị component tương ứng
        switch (currentPage) {
            case 'landing':
                // Hiển thị LandingPage, truyền hàm điều hướng vào
                return <LandingPage onNavigate={handleNavigate as (page: 'login' | 'register') => void} />;
            case 'login':
                // Sử dụng PlaceholderPage tạm thời
                return <PlaceholderPage name="Trang Đăng Nhập" onNavigate={handleNavigate} />; 
            case 'register':
                return <RegisterPage onNavigate={handleNavigate} />;
            case 'dashboard':
                // Sử dụng PlaceholderPage tạm thời
                return <PlaceholderPage name="Dashboard" onNavigate={handleNavigate} />;
            default:
                // Mặc định quay về trang chủ
                return <LandingPage onNavigate={handleNavigate as (page: 'login' | 'register') => void} />;
        }
    };

    return (
        <div className="min-h-screen  w-full">
            {renderPage()}
        </div>
    );
};

export default App;
