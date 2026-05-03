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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="argon-card max-w-md w-full p-6 space-y-6">
                <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                    <h2 className="text-lg font-bold text-gray-700 flex items-center">
                        <div className="argon-icon-badge error mr-3" style={{width:'2.25rem',height:'2.25rem'}}>
                            <AlertTriangle className="text-white" size={18} />
                        </div>
                        {title}
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
                        className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50 border border-gray-200"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="py-2 px-4 text-white rounded-lg font-semibold text-sm transition flex items-center disabled:opacity-50"
                        style={{background: 'linear-gradient(195deg, #EF5350, #E53935)', boxShadow: '0 3px 5px -1px rgba(244,67,54,0.2)'}}
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
