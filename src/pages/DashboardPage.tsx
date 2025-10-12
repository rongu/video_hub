import React, { useState, useEffect } from 'react';
// CHÚ THÍCH: Các import này cần được giải quyết trong file '../services/firebase.ts'
// Các hàm cần thiết: getFirebaseAuth, getFirebaseDB, getTransactionCollectionPath, handleSignOut
import { getFirebaseAuth, getFirebaseDB, getTransactionCollectionPath, handleSignOut } from '../services/firebase.ts';
import { collection, addDoc, serverTimestamp, query, onSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'; 

// Định nghĩa kiểu dữ liệu cho giao dịch hiển thị
interface DisplayTransaction {
    id: string; // ID Document của Firestore (cần cho Update/Delete sau này)
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: number; // Thời gian (milliseconds) để sắp xếp
}

interface DashboardPageProps {
    onLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
    // States cho Dashboard
    const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
    const [balance, setBalance] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);
    const [loading, setLoading] = useState(true);

    // States cho Form Thêm giao dịch (Modal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        description: '',
        amount: '', 
        type: 'expense' as 'income' | 'expense',
    });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Lấy instance Auth và DB
    // Lưu ý: Các hàm này phải được định nghĩa trong file services/firebase.ts
    const auth = getFirebaseAuth();
    const db = getFirebaseDB();
    const userId = auth?.currentUser?.uid;

    // --- LOGIC FORM THÊM GIAO DỊCH (TẠO - CREATE) ---

    // Xử lý thay đổi input trong form
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewTransaction(prev => ({ ...prev, [name]: value }));
        setFormError('');
    };

    // Xử lý lưu giao dịch vào Firestore
    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        const amountNum = parseFloat(newTransaction.amount);
        
        if (!newTransaction.description || isNaN(amountNum) || amountNum <= 0) {
            setFormError('Vui lòng nhập mô tả và số tiền hợp lệ.');
            return;
        }
        
        if (!userId || !db) {
            setFormError('Lỗi hệ thống: Dịch vụ chưa sẵn sàng hoặc người dùng chưa đăng nhập.');
            return;
        }

        setIsSaving(true);
        setFormError('');

        try {
            // Lấy đường dẫn collection an toàn (Hàm từ firebase.ts)
            const path = getTransactionCollectionPath(userId);
            const transactionData = {
                description: newTransaction.description,
                amount: amountNum,
                type: newTransaction.type,
                timestamp: serverTimestamp(), // Ghi nhận thời gian từ server
            };

            // Thêm tài liệu vào collection
            await addDoc(collection(db, path), transactionData);

            // Reset form và đóng modal sau khi lưu thành công
            setNewTransaction({ description: '', amount: '', type: 'expense' });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Lỗi khi thêm tài liệu: ", error);
            setFormError('Lỗi khi lưu giao dịch. Vui lòng kiểm tra console.');
        } finally {
            setIsSaving(false);
        }
    };


    // --- LOGIC TÍNH TOÁN SỐ DƯ ---

    useEffect(() => {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        setTotalIncome(income);
        setTotalExpense(expense);
        setBalance(income - expense);
    }, [transactions]);


    // --- LOGIC ĐỌC DỮ LIỆU TỪ FIRESTORE (READ real-time) ---

    useEffect(() => {
        // Chỉ chạy nếu DB và UserId đã sẵn sàng
        if (!db || !userId) {
            setLoading(false);
            return;
        }

        // Lấy đường dẫn collection (Hàm từ firebase.ts)
        const path = getTransactionCollectionPath(userId);
        const q = query(collection(db, path));
        
        // Thiết lập listener real-time (onSnapshot)
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTransactions: DisplayTransaction[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
                const data = doc.data() as any;
                
                // Xử lý chuyển đổi Firestore Timestamp sang number (milliseconds)
                const dateNum = data.timestamp?.toDate ? data.timestamp.toDate().getTime() : Date.now();
                
                return {
                    id: doc.id,
                    description: data.description || 'Không mô tả',
                    amount: data.amount || 0,
                    type: data.type === 'income' ? 'income' : 'expense',
                    date: dateNum,
                };
            });
            
            setTransactions(fetchedTransactions);
            setLoading(false);
        }, (error) => {
            console.error("Lỗi khi lắng nghe giao dịch: ", error);
            setLoading(false);
        });

        // Hủy đăng ký listener khi component unmount
        return () => unsubscribe();
    }, [db, userId]); 

    // Format tiền tệ
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    // Hàm xử lý Logout
    const handleLogout = async () => {
        // Gọi hàm đăng xuất từ file firebase.ts
        await handleSignOut();
        onLogout(); // Chuyển hướng về Landing Page
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="ml-4 text-gray-700">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">Lỗi: Không tìm thấy người dùng. Vui lòng đăng nhập lại.</p>
                <button onClick={handleLogout} className="mt-4 text-indigo-600 hover:underline">
                    Đăng nhập
                </button>
            </div>
        );
    }
    

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            
            {/* Modal Thêm Giao dịch */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-bold text-gray-800">Thêm Giao dịch Mới</h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddTransaction}>
                            {/* Loại Giao dịch */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition w-1/2 justify-center"
                                        style={{ borderColor: newTransaction.type === 'income' ? '#10B981' : '#E5E7EB' }}>
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            value="income" 
                                            checked={newTransaction.type === 'income'} 
                                            onChange={handleInputChange} 
                                            className="form-radio text-green-500 h-4 w-4"
                                        />
                                        <span className="text-lg font-semibold text-green-600">Thu nhập</span>
                                    </label>
                                    <label className="flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition w-1/2 justify-center"
                                        style={{ borderColor: newTransaction.type === 'expense' ? '#EF4444' : '#E5E7EB' }}>
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            value="expense" 
                                            checked={newTransaction.type === 'expense'} 
                                            onChange={handleInputChange} 
                                            className="form-radio text-red-500 h-4 w-4"
                                        />
                                        <span className="text-lg font-semibold text-red-600">Chi tiêu</span>
                                    </label>
                                </div>
                            </div>

                            {/* Mô tả */}
                            <div className="mb-4">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Mô tả</label>
                                <input
                                    type="text"
                                    name="description"
                                    id="description"
                                    value={newTransaction.description}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Ví dụ: Tiền ăn trưa, Tiền thuê nhà..."
                                    required
                                />
                            </div>

                            {/* Số tiền */}
                            <div className="mb-6">
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Số tiền (VND)</label>
                                <input
                                    type="number"
                                    name="amount"
                                    id="amount"
                                    value={newTransaction.amount}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Ví dụ: 500000"
                                    min="1"
                                    step="any"
                                    required
                                />
                            </div>

                            {/* Thông báo lỗi */}
                            {formError && (
                                <p className="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded-lg border border-red-200">
                                    {formError}
                                </p>
                            )}

                            {/* Nút Submit */}
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-300"
                            >
                                {isSaving ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Đang lưu...
                                    </div>
                                ) : 'Lưu Giao dịch'}
                            </button>
                        </form>
                    </div>
                </div>
            )}


            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">
                    Bảng điều khiển Tài chính
                </h1>
                <div className="flex items-center space-x-4">
                    {/* Hiển thị userId đầy đủ */}
                    <span className="text-sm text-gray-500 hidden sm:inline truncate">
                        User ID: {userId}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center px-4 py-2 bg-red-500 text-white font-semibold rounded-full shadow-md hover:bg-red-600 transition duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V17a1 1 0 01-1 1h-2a1 1 0 01-1-1v-5.586L3.293 6.707A1 1 0 013 6V3zm3 1h8v2H6V4z" clipRule="evenodd" />
                        </svg>
                        Đăng xuất
                    </button>
                </div>
            </header>

            {/* Nút Thêm Giao dịch Mới */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-full shadow-xl hover:bg-indigo-700 transition transform hover:scale-105"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm Giao dịch Mới
                </button>
            </div>

            {/* Thẻ Tổng quan Tài chính */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Tổng số dư */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                    <p className="text-sm font-medium text-gray-500">Tổng Số dư</p>
                    <p className={`text-4xl font-bold mt-1 ${balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        {formatCurrency(balance)}
                    </p>
                </div>

                {/* Tổng Thu nhập */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
                    <p className="text-sm font-medium text-gray-500">Tổng Thu nhập</p>
                    <p className="text-4xl font-bold text-green-600 mt-1">
                        {formatCurrency(totalIncome)}
                    </p>
                </div>

                {/* Tổng Chi tiêu */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500">
                    <p className="text-sm font-medium text-gray-500">Tổng Chi tiêu</p>
                    <p className="text-4xl font-bold text-red-600 mt-1">
                        {formatCurrency(totalExpense)}
                    </p>
                </div>
            </div>

            {/* Danh sách Giao dịch */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Giao dịch gần đây</h2>
                
                <ul className="divide-y divide-gray-200">
                    {transactions.length === 0 ? (
                        <li className="py-4 text-center text-gray-500">
                            Chưa có giao dịch nào được ghi lại. Hãy thêm giao dịch đầu tiên của bạn!
                        </li>
                    ) : (
                        transactions
                            .sort((a, b) => b.date - a.date) // Sắp xếp theo ngày mới nhất
                            .map((t) => (
                            <li key={t.id} className="py-4 flex justify-between items-center">
                                <div>
                                    <p className="text-base font-medium text-gray-900">{t.description}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(t.date).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                                <p className={`text-lg font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                </p>
                            </li>
                        ))
                    )}
                </ul>
            </div>
            
            <footer className="text-center mt-10 text-gray-500 text-sm">
                <p>Ứng dụng Quản lý Tài chính Cá nhân. Powered by Firebase.</p>
            </footer>
        </div>
    );
};

export default DashboardPage;
