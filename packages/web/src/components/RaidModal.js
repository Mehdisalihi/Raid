import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

const RaidModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-2xl' 
}) => {
  const { isRTL } = useLanguage();
  const { theme } = useTheme();
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

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 lg:p-8">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 400,
                duration: 0.3 
            }}
            className={`relative w-full ${maxWidth} ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'} rounded-[2rem] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.4)] border ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} overflow-hidden flex flex-col max-h-[90vh]`}
          >
            {/* Header */}
            <div className={`p-6 lg:p-8 border-b ${theme === 'dark' ? 'border-white/5 bg-[#1e293b]' : 'border-slate-100 bg-white'} flex items-center justify-between sticky top-0 z-20 ${isRTL ? 'flex-row-reverse' : ''}`}>
               <div>
                  <h2 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                    {title}
                  </h2>
               </div>
               <button 
                onClick={onClose} 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
               >
                 <X size={20} strokeWidth={2.5} />
               </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
               {children}
            </div>

            {/* Subtle decorative background elements */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default RaidModal;
