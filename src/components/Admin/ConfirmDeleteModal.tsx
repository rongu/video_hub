import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    isProcessing: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    description, 
    confirmLabel = 'Xác nhận Xóa',
    isProcessing,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6 transform transition-all duration-300 scale-100 opacity-100 border-t-8 border-red-500">
                <div className="flex justify-between items-start border-b pb-3">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <AlertTriangle className="text-red-500 mr-2 h-6 w-6" /> {title}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                        disabled={isProcessing}
                    >
                        <X size={24} />
                    </button>
                </div>

                <p className="text-gray-600 text-sm">
                    {description}
                </p>

                <div className="flex justify-end space-x-3 pt-2">
                    <button 
                        onClick={onClose}
                        disabled={isProcessing}
                        className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition disabled:opacity-50"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <span className="flex items-center">
                                <span className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                                Đang Xóa...
                            </span>
                        ) : (
                            <><Trash2 size={18} className="mr-2" /> {confirmLabel}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
