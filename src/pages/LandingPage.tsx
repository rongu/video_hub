import React from 'react';

// Định nghĩa props để nhận hàm điều hướng từ App.tsx
// Các trang đích có thể là 'login' hoặc 'register'
interface LandingPageProps {
  onNavigate: (page: 'login' | 'register') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-sans">
      <div className="bg-gray-800 p-10 rounded-xl shadow-2xl w-full max-w-md text-center border border-indigo-700/50">
        
        {/* Tiêu đề chính */}
        <h1 className="text-4xl font-extrabold mb-4 text-indigo-400">👋 VideoHub Platform</h1>
        <p className="text-gray-300 mb-8">Nền tảng quản lý và phân phối nội dung video.</p>
        
        {/* Khu vực nút bấm */}
        <div className="space-y-4">
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg transition duration-200 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg shadow-lg transition duration-200 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-gray-500/50"
          >
            Đăng Ký
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
