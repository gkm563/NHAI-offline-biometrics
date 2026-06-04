import React, { useState, useEffect } from 'react';
import { EnrollmentScreen } from './biometrics/screens/EnrollmentScreen';
import { VerificationScreen } from './biometrics/screens/VerificationScreen';
import { DiagnosticsDashboard } from './biometrics/screens/DiagnosticsDashboard';
import SecureBiometricDatabase from './biometrics/services/db';
import SyncEngine from './biometrics/services/sync';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ENROLL' | 'VERIFY' | 'DIAGNOSTICS'>('ENROLL');
  const db = SecureBiometricDatabase.getInstance();
  const syncEngine = SyncEngine.getInstance();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);

  const [stats, setStats] = useState({
    userCount: db.getAllUsers().length,
    pendingQueueCount: db.getPendingQueue().length,
    networkStatus: syncEngine.getNetworkStatus()
  });

  // Handle window resizing for responsive layouts
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 850);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keep global stats synced
  useEffect(() => {
    const timer = setInterval(() => {
      setStats({
        userCount: db.getAllUsers().length,
        pendingQueueCount: db.getPendingQueue().length,
        networkStatus: syncEngine.getNetworkStatus()
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dynamicMainLayout = {
    ...styles.mainLayout,
    display: isMobile ? 'flex' : 'grid',
    flexDirection: isMobile ? 'column' as const : 'row' as const,
    gridTemplateColumns: isMobile ? undefined : '260px 1fr',
    height: isMobile ? 'auto' : 'calc(100vh - 64px)',
    maxHeight: isMobile ? 'auto' : 'calc(100vh - 64px)',
    overflow: isMobile ? 'visible' : 'hidden',
    padding: isMobile ? '16px' : '24px',
    gap: isMobile ? '16px' : '24px'
  };

  const dynamicAppContainer = {
    ...styles.appContainer,
    height: isMobile ? 'auto' : '100vh',
    maxHeight: isMobile ? 'auto' : '100vh',
    overflow: isMobile ? 'visible' : 'hidden'
  };

  return (
    <div style={dynamicAppContainer}>
      {/* Top Banner / Header */}
      <header style={styles.header}>
        <div style={styles.headerBrand}>
          <span style={styles.logoIcon}>🛡️</span>
          <div>
            <h1 style={styles.brandTitle}>NHAI OFFLINE BIOMETRIC PORTAL</h1>
            <span style={styles.brandSubtitle}>DataLake 3.0 Module - Edge AI Face Auth & Liveness</span>
          </div>
        </div>

        <div style={styles.headerBadges}>
          <div style={styles.badge}>
            HACKATHON 7.0 PROTOTYPE
          </div>
          <div style={{
            ...styles.networkBadge,
            backgroundColor: stats.networkStatus === 'ONLINE' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)',
            borderColor: stats.networkStatus === 'ONLINE' ? '#00e676' : '#ff1744',
            color: stats.networkStatus === 'ONLINE' ? '#69f0ae' : '#ff5252'
          }}>
            {stats.networkStatus === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main style={dynamicMainLayout}>
        
        {/* Left Sidebar Info panel */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarCard}>
            <h3 style={styles.sidebarTitle}>📋 Operational Telemetry</h3>
            <div style={styles.statGroup}>
              <div style={styles.statLabel}>Enrolled Operators</div>
              <div style={styles.statValue}>{stats.userCount} Profiles</div>
            </div>
            <div style={styles.statGroup}>
              <div style={styles.statLabel}>Sync Queue Size</div>
              <div style={{
                ...styles.statValue,
                color: stats.pendingQueueCount > 0 ? '#ff5252' : '#00e5ff'
              }}>
                {stats.pendingQueueCount} Records
              </div>
            </div>
            <div style={styles.statGroup}>
              <div style={styles.statLabel}>Inference Model</div>
              <div style={styles.statValue}>MobileFaceNet (INT8)</div>
            </div>
            <div style={styles.statGroup}>
              <div style={styles.statLabel}>Model Footprint</div>
              <div style={styles.statValue}>1.83 MB</div>
            </div>
          </div>

          <div style={styles.sidebarCard}>
            <h3 style={styles.sidebarTitle}>💡 Quick Instructions</h3>
            <ul style={styles.instructionsList}>
              <li>👥 <strong>Enrollment</strong>: Register new field personnel. Generates salted AES-256 templates locally.</li>
              <li>🔒 <strong>Verification</strong>: Test offline match accuracy & anti-spoofing challenge sequences.</li>
              <li>📊 <strong>Diagnostics</strong>: Toggle networks, test CPU thermal stress, and verify DoD purging compliance logs.</li>
            </ul>
          </div>

          <div style={styles.teamCard}>
            <div style={styles.teamTitle}>United Institute of Technology</div>
            <div style={styles.teamSubtitle}>UIT Naini, Prayagraj, UP</div>
            <div style={styles.teamMeta}>
              Leader: Gautam Kumar Maurya<br/>
              Members: Rohit Pal, Praveen Singh
            </div>
          </div>
        </aside>

        {/* Center / Right Content Panel */}
        <section style={styles.contentArea}>
          
          {/* Navigation Tabs */}
          <nav style={styles.tabNav}>
            <button 
              onClick={() => setActiveTab('ENROLL')}
              style={{
                ...styles.tabBtn,
                color: activeTab === 'ENROLL' ? '#00e5ff' : '#94a3b8',
                borderBottomColor: activeTab === 'ENROLL' ? '#00e5ff' : 'transparent',
                backgroundColor: activeTab === 'ENROLL' ? 'rgba(0, 229, 255, 0.04)' : 'transparent'
              }}
            >
              👥 ENROLL OPERATOR
            </button>
            <button 
              onClick={() => setActiveTab('VERIFY')}
              style={{
                ...styles.tabBtn,
                color: activeTab === 'VERIFY' ? '#00e5ff' : '#94a3b8',
                borderBottomColor: activeTab === 'VERIFY' ? '#00e5ff' : 'transparent',
                backgroundColor: activeTab === 'VERIFY' ? 'rgba(0, 229, 255, 0.04)' : 'transparent'
              }}
            >
              🔒 OFFLINE AUTH
            </button>
            <button 
              onClick={() => setActiveTab('DIAGNOSTICS')}
              style={{
                ...styles.tabBtn,
                color: activeTab === 'DIAGNOSTICS' ? '#00e5ff' : '#94a3b8',
                borderBottomColor: activeTab === 'DIAGNOSTICS' ? '#00e5ff' : 'transparent',
                backgroundColor: activeTab === 'DIAGNOSTICS' ? 'rgba(0, 229, 255, 0.04)' : 'transparent'
              }}
            >
              📊 TELEMETRY & DIAGS
            </button>
          </nav>

          {/* Active Screen Rendering */}
          <div style={styles.screenWrapper}>
            {activeTab === 'ENROLL' && <EnrollmentScreen />}
            {activeTab === 'VERIFY' && <VerificationScreen />}
            {activeTab === 'DIAGNOSTICS' && <DiagnosticsDashboard />}
          </div>

        </section>

      </main>
    </div>
  );
};

const styles = {
  appContainer: {
    height: '100vh',
    maxHeight: '100vh',
    backgroundColor: '#030712',
    backgroundImage: 'radial-gradient(circle at top right, rgba(0, 229, 255, 0.03), transparent 400px), radial-gradient(circle at bottom left, rgba(0, 230, 118, 0.02), transparent 450px)',
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
    overflow: 'hidden'
  },
  header: {
    height: '64px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(7, 13, 25, 0.8)',
    backdropFilter: 'blur(10px)',
    boxSizing: 'border-box' as const,
    zIndex: 100
  },
  headerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoIcon: {
    fontSize: '28px',
    filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.4))'
  },
  brandTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#f8fafc',
    margin: 0,
    letterSpacing: '0.5px'
  },
  brandSubtitle: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: 500
  },
  headerBadges: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  badge: {
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    color: '#ffd600',
    border: '1px solid #ffd600',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold' as const
  },
  networkBadge: {
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    transition: 'all 0.3s ease'
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    height: 'calc(100vh - 64px)',
    maxHeight: 'calc(100vh - 64px)',
    padding: '24px',
    gap: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const,
    overflow: 'hidden'
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    height: '100%',
    overflowY: 'auto' as const,
    paddingRight: '4px'
  },
  sidebarCard: {
    backgroundColor: '#070d19',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    flexShrink: 0
  },
  sidebarTitle: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#f8fafc',
    marginBottom: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px'
  },
  statGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '11px'
  },
  statLabel: {
    color: '#94a3b8'
  },
  statValue: {
    fontWeight: 'bold' as const,
    color: '#f8fafc'
  },
  instructionsList: {
    paddingLeft: '16px',
    margin: 0,
    fontSize: '10px',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    lineHeight: '1.4'
  },
  teamCard: {
    backgroundColor: 'rgba(0, 229, 255, 0.02)',
    border: '1px dashed rgba(0, 229, 255, 0.15)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: 'auto',
    flexShrink: 0
  },
  teamTitle: {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    color: '#00e5ff'
  },
  teamSubtitle: {
    fontSize: '9px',
    color: '#64748b',
    marginBottom: '8px'
  },
  teamMeta: {
    fontSize: '9px',
    color: '#94a3b8',
    lineHeight: '1.4'
  },
  contentArea: {
    backgroundColor: '#070d19',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
  },
  tabNav: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: '#0a0f1d',
    flexShrink: 0
  },
  tabBtn: {
    flex: 1,
    padding: '14px',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    letterSpacing: '0.5px'
  },
  screenWrapper: {
    padding: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'start',
    overflowY: 'auto' as const,
    flex: 1,
    boxSizing: 'border-box' as const
  }
};

export default App;
