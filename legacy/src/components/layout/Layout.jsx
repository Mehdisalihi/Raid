import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAppStore } from '../../hooks/useAppStore';

const Layout = ({ children }) => {
  const { language, activePage, setActivePage } = useAppStore();
  return (
    <div className="layout-container" style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-main)',
      direction: language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <Sidebar />
      <div className="main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main className="content-area custom-scroll" style={{
          padding: '2.5rem',
          overflow: 'auto',
          background: 'transparent',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
