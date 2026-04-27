import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2, HelpCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

const RaidDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm, 
  type = 'info', // info, success, warning, danger, confirm
  confirmText,
  cancelText
}) => {
  const { isRTL } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!mounted) return null;

  const icons = {
    info: <HelpCircle className="text-blue-500" size={26} />,
    success: <CheckCircle2 className="text-green-500" size={26} />,
    warning: <AlertTriangle className="text-orange-500" size={26} />,
    danger: <AlertCircle className="text-red-500" size={26} />,
    confirm: <HelpCircle className="text-primary" size={26} />,
  };

  const bgColors = {
    info: 'bg-blue-50/50',
    success: 'bg-green-50/50',
    warning: 'bg-orange-50/50',
    danger: 'bg-red-50/50',
    confirm: 'bg-primary/5',
  };

  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          
          {/* Dialog Card */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 400,
              duration: 0.2
            }}
            className={`relative w-full max-w-[340px] bg-white rounded-[1.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <div className="p-6">
              <div className="flex flex-col items-center gap-4 mb-5">
                <motion.div 
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className={`p-3 rounded-xl ${bgColors[type] || 'bg-slate-50'}`}
                >
                  {icons[type] || icons.info}
                </motion.div>
                
                <div className="text-center px-2">
                  <h3 className="text-lg font-black text-slate-900 mb-1.5 tracking-tight leading-tight">
                    {title}
                  </h3>
                  <p className="text-slate-500 font-bold text-[13px] leading-relaxed opacity-80">
                    {message}
                  </p>
                </div>
              </div>

              <div className={`flex gap-2.5 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                {type === 'confirm' || onConfirm ? (
                  <>
                    <button
                      onClick={onClose}
                      className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 font-black text-[13px] hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      {cancelText || (isRTL ? 'إلغاء' : 'Annuler')}
                    </button>
                    <button
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                      className={`flex-1 h-10 rounded-lg font-black text-[13px] text-white shadow-lg transition-all active:scale-[0.98] ${
                        type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-primary hover:bg-primary-dark shadow-primary-glow'
                      }`}
                    >
                      {confirmText || (isRTL ? 'تأكيد' : 'Confirmer')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full h-10 rounded-lg bg-slate-900 text-white font-black text-[13px] hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    {confirmText || (isRTL ? 'إغلاق' : 'Fermer')}
                  </button>
                )}
              </div>
            </div>

            {/* Decorative subtle gradient */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(dialogContent, document.body);
};

export default RaidDialog;
