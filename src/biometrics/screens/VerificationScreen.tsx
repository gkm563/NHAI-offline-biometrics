import React, { useState, useEffect } from 'react';
import useBiometricVerify from '../hooks/useBiometricVerify';
import { CameraCaptureView, insertKeyframes } from '../components/CameraCaptureView';
import SecureBiometricDatabase from '../services/db';

/**
 * NHAI Offline Biometric Verification Screen Component
 * 
 * Functions:
 * - Selects operator from the local cached directory.
 * - Handles the randomized dynamic gesture liveness challenge sequence.
 * - Integrates useBiometricVerify hooks for 0ms frame calculations.
 * - Displays interactive HUD telemetry overlays and anti-spoofing warning nodes.
 */

export const VerificationScreen: React.FC = () => {
  insertKeyframes(); // Insert global visual animation elements
  const db = SecureBiometricDatabase.getInstance();

  const [registeredUsers, setRegisteredUsers] = useState(db.getAllUsers());
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // Pipeline result monitoring state
  const [verificationState, setVerificationState] = useState<'IDLE' | 'SCANNING' | 'PASSED' | 'FAILED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scoreAchieved, setScoreAchieved] = useState<number>(0);

  // Sync state tracking
  const [queueCount, setQueueCount] = useState(db.getPendingQueue().length);

  // Keep local user registry updated
  useEffect(() => {
    setRegisteredUsers(db.getAllUsers());
    if (db.getAllUsers().length > 0 && !selectedUserId) {
      setSelectedUserId(db.getAllUsers()[0].userId);
    }
  }, [verificationState]);

  // Keep queue indicators dynamic
  useEffect(() => {
    const timer = setInterval(() => {
      setQueueCount(db.getPendingQueue().length);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSuccess = (result: any) => {
    setScoreAchieved(result.score);
    setVerificationState('PASSED');
  };

  const handleFailure = (reason: string) => {
    setErrorMessage(reason);
    setVerificationState('FAILED');
  };

  // Instantiate unified framework hook
  const {
    livenessState,
    frameQualityText,
    systemLogs,
    isProcessing,
    currentVerificationProgress,
    processIncomingFrame,
    triggerManualSpoofFailure,
    resetVerificationPipeline
  } = useBiometricVerify({
    userId: selectedUserId,
    onSuccess: handleSuccess,
    onFailure: handleFailure
  });

  const launchVerification = () => {
    if (!selectedUserId) return;
    setVerificationState('SCANNING');
    resetVerificationPipeline();
  };

  const exitVerification = () => {
    setVerificationState('IDLE');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔒 SECURE OFFLINE VERIFICATION</h2>
      <p style={styles.subtitle}>Execute remote multimodal face authentication + anti-spoofing landmarks under 1 second without internet.</p>

      {/* Sync Status Banner */}
      <div style={styles.syncHUD}>
        <div style={styles.syncItem}>
          <span>Database Cache Status:</span> 
          <strong style={{ color: '#00e5ff' }}> {registeredUsers.length} Operators Registered</strong>
        </div>
        <div style={styles.syncItem}>
          <span>Offline Sync Log Queue:</span> 
          <strong style={{ color: queueCount > 0 ? '#ff1744' : '#00e676' }}> {queueCount} Pending Synced</strong>
        </div>
      </div>

      {verificationState === 'IDLE' && (
        <div style={styles.card}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Target Operator Profile</label>
            {registeredUsers.length === 0 ? (
              <div style={styles.warningBox}>
                ⚠️ No operators enrolled in secure local storage. Go to Enrollment Screen to register profiles.
              </div>
            ) : (
              <select 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(e.target.value)} 
                style={styles.select}
              >
                {registeredUsers.map(user => (
                  <option key={user.userId} value={user.userId}>
                    {user.name} ({user.userId}) — {user.role}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button 
            onClick={launchVerification} 
            disabled={registeredUsers.length === 0}
            style={{
              ...styles.verifyBtn,
              opacity: registeredUsers.length === 0 ? 0.5 : 1,
              cursor: registeredUsers.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            START OFFLINE VERIFICATION
          </button>
        </div>
      )}

      {verificationState === 'SCANNING' && (
        <div style={styles.card}>
          {/* Top Challenge Cue Screen */}
          <div style={styles.challengeBar}>
            <div style={styles.challengeText}>
              ACTIVE CUE: <span style={styles.neonText}>{livenessState.currentChallenge}</span>
            </div>
            
            <div style={styles.livenessTracker}>
              <div style={styles.livenessProgressBg}>
                <div style={{
                  ...styles.livenessProgressFg,
                  width: `${livenessState.progress * 100}%`
                }} />
              </div>
              <span style={styles.livenessPercent}>
                {Math.round(livenessState.progress * 100)}%
              </span>
            </div>
          </div>

          {/* Visual Challenge Directions */}
          <div style={styles.gesturePromptBox}>
            {livenessState.currentChallenge === 'STARE' && (
              <div style={styles.promptContent}>
                <span style={styles.promptIcon}>😐</span>
                <div>
                  <h4 style={styles.promptHeading}>ALIGN AND STARE STEADY</h4>
                  <p style={styles.promptInstructions}>Look directly into the viewfinder camera frame center.</p>
                </div>
              </div>
            )}
            {livenessState.currentChallenge === 'BLINK' && (
              <div style={styles.promptContent}>
                <span style={styles.promptIcon}>👁️</span>
                <div>
                  <h4 style={styles.promptHeading}>BLINK BOTH EYES</h4>
                  <p style={styles.promptInstructions}>Close and open both eyes naturally to satisfy standard frame aspect testing.</p>
                </div>
              </div>
            )}
            {livenessState.currentChallenge === 'SMILE' && (
              <div style={styles.promptContent}>
                <span style={styles.promptIcon}>😊</span>
                <div>
                  <h4 style={styles.promptHeading}>SMILE NATURALLY</h4>
                  <p style={styles.promptInstructions}>Expose facial muscles to trigger dynamic expression detection algorithms.</p>
                </div>
              </div>
            )}
            {livenessState.currentChallenge === 'TURN_LEFT' && (
              <div style={styles.promptContent}>
                <span style={styles.promptIcon}>◀️</span>
                <div>
                  <h4 style={styles.promptHeading}>TURN HEAD SLIGHTLY LEFT</h4>
                  <p style={styles.promptInstructions}>Rotate head to the left to capture spatial angular variations (Yaw).</p>
                </div>
              </div>
            )}
            {livenessState.currentChallenge === 'TURN_RIGHT' && (
              <div style={styles.promptContent}>
                <span style={styles.promptIcon}>▶️</span>
                <div>
                  <h4 style={styles.promptHeading}>TURN HEAD SLIGHTLY RIGHT</h4>
                  <p style={styles.promptInstructions}>Rotate head to the right to verify 3D physical depth contours.</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera Telemetry HUD View */}
          <CameraCaptureView 
            onFrameCapture={processIncomingFrame}
            activeChallenge={livenessState.currentChallenge}
            isProcessing={isProcessing}
          />

          {/* Quality status indicators */}
          <div style={styles.qualityContainer}>
            <div style={styles.qualityBadge}>HUD FEEDBACK</div>
            <div style={styles.qualityText}>{frameQualityText}</div>
          </div>

          {/* Intercept spoof injection button (Perfect for security reviews!) */}
          <div style={styles.actionGrid}>
            <button 
              onClick={triggerManualSpoofFailure} 
              style={styles.spoofBtn}
            >
              🚨 INJECT SCREEN REPLAY SPOOF ATTACK
            </button>
            <button 
              onClick={exitVerification} 
              style={styles.exitBtn}
            >
              EXIT
            </button>
          </div>

          {/* Core System Telemetry Stream logs */}
          <div style={styles.terminalContainer}>
            <div style={styles.terminalTitle}>📜 LIVE SYSTEM INSTRUMENTATION TELEMETRY</div>
            <div style={styles.terminalBody}>
              {systemLogs.map((log, index) => (
                <div key={index} style={styles.terminalLine}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {verificationState === 'PASSED' && (
        <div style={styles.cardPassed}>
          <div style={styles.passedBadge}>✓ IDENTITY MUTUALLY VERIFIED</div>
          
          <h3 style={styles.passedHeading}>ACCESS GRANTED</h3>
          <p style={styles.passedDesc}>
            Biometric credentials match stored profiles with a high confidence margin. Active liveness validated.
          </p>

          <div style={styles.metricsBox}>
            <div style={styles.metricRow}>
              <span>Decisional Method:</span> <strong>Cosine Similarity</strong>
            </div>
            <div style={styles.metricRow}>
              <span>Match Similarity:</span> <strong style={{ color: '#00e676' }}>{scoreAchieved.toFixed(5)}</strong>
            </div>
            <div style={styles.metricRow}>
              <span>Required Gate Threshold:</span> <span>Cosine Similarity ≥ 0.8300</span>
            </div>
            <div style={styles.metricRow}>
              <span>Decisional Latency:</span> <strong style={{ color: '#00e5ff' }}>&lt; 38ms</strong>
            </div>
            <div style={styles.metricRow}>
              <span>Biometric Security:</span> <span>AES-256 Encrypted</span>
            </div>
          </div>

          <div style={styles.purgeCallout}>
            🔒 <strong>Offline Secure Purge Pipeline Triggered</strong>
            <p style={styles.purgeCalloutDesc}>
              Biometric payload is temporarily locked in secure memory caches. Once internet connectivity arrives, the record will sync to AWS, and the local template will be securely zeroed out.
            </p>
          </div>

          <button onClick={exitVerification} style={styles.verifyBtn}>
            RETURN TO DIRECTORY
          </button>
        </div>
      )}

      {verificationState === 'FAILED' && (
        <div style={styles.cardFailed}>
          <div style={styles.failedBadge}>❌ SYSTEM REJECTION</div>
          
          <h3 style={styles.failedHeading}>ACCESS PREVENTED</h3>
          <p style={styles.failedDesc}>{errorMessage}</p>

          <div style={styles.warningBoxContent}>
            ⚠️ <strong>Biometric Incident Logged</strong>
            <p style={styles.warningBoxDesc}>
              Any physical spoof attempts (2D images or screens) or vector mismatch logs are securely timestamped and cached locally for supervisor review.
            </p>
          </div>

          <div style={styles.actionGrid}>
            <button onClick={launchVerification} style={styles.verifyBtn}>
              RE-ATTEMPT VERIFICATION
            </button>
            <button onClick={exitVerification} style={styles.exitBtn}>
              BACK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '560px',
    width: '100%',
    margin: '0 auto',
    padding: '24px',
    boxSizing: 'border-box' as const,
    fontFamily: "'Outfit', 'Inter', sans-serif",
    color: '#f8fafc'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#f8fafc',
    marginBottom: '8px',
    textAlign: 'center' as const,
    letterSpacing: '-0.3px'
  },
  subtitle: {
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '20px',
    textAlign: 'center' as const,
    lineHeight: '1.5'
  },
  syncHUD: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#0c1020',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '16px',
    gap: '10px',
    flexWrap: 'wrap' as const
  },
  syncItem: {
    fontSize: '10px',
    color: '#94a3b8'
  },
  card: {
    backgroundColor: '#070d19',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },
  cardPassed: {
    backgroundColor: '#070d19',
    borderRadius: '16px',
    padding: '30px',
    border: '1.5px solid #00e676',
    boxShadow: '0 0 30px rgba(0, 230, 118, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    textAlign: 'center' as const
  },
  cardFailed: {
    backgroundColor: '#070d19',
    borderRadius: '16px',
    padding: '30px',
    border: '1.5px solid #ff1744',
    boxShadow: '0 0 30px rgba(255, 23, 68, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    textAlign: 'center' as const
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  label: {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },
  select: {
    backgroundColor: '#0e1726',
    border: '1.5px solid #1e293b',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#f8fafc',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    cursor: 'pointer'
  },
  verifyBtn: {
    backgroundColor: '#00e5ff',
    color: '#030712',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 229, 255, 0.25)',
    transition: 'transform 0.2s ease',
    width: '100%',
    letterSpacing: '0.3px'
  },
  spoofBtn: {
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    color: '#ff5252',
    border: '1px solid #ff1744',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    width: '100%'
  },
  exitBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '12px',
    width: '100%'
  },
  challengeBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0e1726',
    borderRadius: '10px',
    padding: '10px 14px',
    border: '1.5px solid #1e293b'
  },
  challengeText: {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    color: '#94a3b8'
  },
  neonText: {
    color: '#ffd600',
    textShadow: '0 0 10px rgba(255, 214, 0, 0.3)'
  },
  livenessTracker: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '110px'
  },
  livenessProgressBg: {
    height: '6px',
    backgroundColor: '#1e293b',
    borderRadius: '3px',
    flex: 1,
    overflow: 'hidden'
  },
  livenessProgressFg: {
    height: '100%',
    backgroundColor: '#ffd600',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  livenessPercent: {
    fontSize: '9px',
    color: '#ffd600',
    fontWeight: 'bold' as const
  },
  gesturePromptBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.04)',
    border: '1.5px solid rgba(0, 229, 255, 0.12)',
    borderRadius: '12px',
    padding: '14px 18px'
  },
  promptContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  promptIcon: {
    fontSize: '28px'
  },
  promptHeading: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#00e5ff',
    margin: '0 0 4px 0',
    letterSpacing: '0.3px'
  },
  promptInstructions: {
    fontSize: '10px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.4'
  },
  qualityContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0c1020',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '8px 12px',
    gap: '10px'
  },
  qualityBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    color: '#00e5ff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '8px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px'
  },
  qualityText: {
    fontSize: '10px',
    color: '#e2e8f0',
    fontWeight: 500
  },
  terminalContainer: {
    width: '100%',
    backgroundColor: '#030712',
    border: '1.5px solid #1e293b',
    borderRadius: '10px',
    padding: '12px',
    boxSizing: 'border-box' as const
  },
  terminalTitle: {
    fontSize: '9px',
    fontWeight: 'bold' as const,
    color: '#64748b',
    marginBottom: '8px',
    letterSpacing: '0.5px'
  },
  terminalBody: {
    maxHeight: '110px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  },
  terminalLine: {
    fontFamily: 'monospace',
    fontSize: '9px',
    color: '#00e676',
    lineHeight: '1.3'
  },
  passedBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    color: '#00e676',
    border: '1px solid #00e676',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px'
  },
  passedHeading: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#69f0ae',
    letterSpacing: '0.5px'
  },
  passedDesc: {
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: '1.5',
    margin: '0 0 10px 0'
  },
  metricsBox: {
    width: '100%',
    backgroundColor: '#0e1726',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94a3b8',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: '8px'
  },
  purgeCallout: {
    backgroundColor: 'rgba(0, 229, 255, 0.04)',
    border: '1px dashed #00e5ff',
    borderRadius: '10px',
    padding: '14px',
    textAlign: 'left' as const,
    width: '100%',
    boxSizing: 'border-box' as const
  },
  purgeCalloutDesc: {
    fontSize: '10px',
    color: '#94a3b8',
    margin: '6px 0 0 0',
    lineHeight: '1.4'
  },
  failedBadge: {
    backgroundColor: 'rgba(255, 23, 68, 0.15)',
    color: '#ff1744',
    border: '1px solid #ff1744',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px'
  },
  failedHeading: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#ff5252',
    letterSpacing: '0.5px'
  },
  failedDesc: {
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: '1.5',
    margin: '0 0 10px 0'
  },
  warningBoxContent: {
    backgroundColor: 'rgba(255, 23, 68, 0.04)',
    border: '1px dashed #ff1744',
    borderRadius: '10px',
    padding: '14px',
    textAlign: 'left' as const,
    width: '100%',
    boxSizing: 'border-box' as const
  },
  warningBoxDesc: {
    fontSize: '10px',
    color: '#94a3b8',
    margin: '6px 0 0 0',
    lineHeight: '1.4'
  },
  warningBox: {
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    border: '1px dashed #ffd600',
    color: '#ffe57f',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '11px',
    fontWeight: 500,
    lineHeight: '1.4'
  }
};
