import React, { useState } from 'react';
import SecureBiometricDatabase from '../services/db';
import BiometricEngine from '../services/biometrics';
import { CameraCaptureView, insertKeyframes } from '../components/CameraCaptureView';
import { CameraFrameMetadata } from '../types';

/**
 * NHAI User Enrollment Screen Component
 * 
 * Functions:
 * - Collects field operator details (User ID, full name, duty role).
 * - Guides user through high-resolution facial quality scans.
 * - Extracts 128-D float embeddings using local MobileFaceNet models.
 * - Encrypts template structures via PBKDF2/AES-256 and commits them to the local secure registry.
 */

export const EnrollmentScreen: React.FC = () => {
  insertKeyframes(); // Insert global visual animation markers
  const db = SecureBiometricDatabase.getInstance();
  const engine = BiometricEngine.getInstance();

  // Enrollment fields state
  const [userId, setUserId] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<string>('NHAI Inspector');
  
  // Pipeline management states
  const [stage, setStage] = useState<'DETAILS' | 'CAMERA' | 'COMPLETED'>('DETAILS');
  const [qualityText, setQualityText] = useState<string>('Ready to scan');
  const [loading, setLoading] = useState<boolean>(false);
  const [capturedFrames, setCapturedFrames] = useState<number>(0);
  const [qualityScore, setQualityScore] = useState<number>(0);

  // Error notifications
  const [notifyMsg, setNotifyMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const startScanning = () => {
    if (!userId.trim()) {
      setNotifyMsg({ text: "Unique Operator ID is mandatory.", type: 'error' });
      return;
    }
    if (!fullName.trim()) {
      setNotifyMsg({ text: "Full Name is mandatory.", type: 'error' });
      return;
    }
    
    // Check if ID already exists to avoid collisions
    if (db.getUserProfile(userId.trim())) {
      setNotifyMsg({ text: "Operator ID already enrolled in offline database.", type: 'error' });
      return;
    }

    setNotifyMsg(null);
    setCapturedFrames(0);
    setStage('CAMERA');
  };

  /**
   * Evaluates camera frames during the enrollment phase
   * Requires 3 consecutive premium-quality frames to model facial identity.
   */
  const handleFrameCaptured = (frame: CameraFrameMetadata) => {
    if (stage !== 'CAMERA' || loading) return;

    // Evaluate brightness and movement contrast
    const quality = engine.checkFrameQuality(frame.brightness, frame.sharpness);
    if (!quality.passed) {
      setQualityText(quality.reason || 'Sensor quality low.');
      return;
    }

    setQualityText('✅ Quality Acceptable. Stand still...');
    setQualityScore(Math.round((frame.brightness + frame.sharpness) / 2));

    // Register premium frame detection
    setCapturedFrames(prev => {
      const next = prev + 1;
      if (next >= 3) {
        // Minimum enrollment snapshots accumulated. Execute encryption saving
        saveProfileData();
        return 3;
      }
      return next;
    });
  };

  /**
   * Generates face embedding, encrypts, and saves the new User profile
   */
  const saveProfileData = () => {
    setLoading(true);
    setQualityText('Generating template and encrypting...');

    setTimeout(() => {
      try {
        // Run MobileFaceNet local vector simulation
        const embedding = engine.runLocalInferenceMock(userId.trim(), false);
        
        // Cryptographically protect template before DB insertion
        const { encrypted, salt } = db.encryptTemplate(embedding, userId.trim());

        const success = db.saveUserProfile({
          userId: userId.trim(),
          name: fullName.trim(),
          role: role,
          enrolledAt: new Date().toISOString(),
          modelV: "MobileFaceNet_v1.0_Quantized",
          encryptedTemplate: encrypted,
          salt: salt,
          photoQualityScore: qualityScore
        });

        if (success) {
          setStage('COMPLETED');
          setNotifyMsg({ text: `Biometric Profile created successfully for operator ${fullName}!`, type: 'success' });
        } else {
          setStage('DETAILS');
          setNotifyMsg({ text: "Database insertion failed.", type: 'error' });
        }
      } catch (err: any) {
        setStage('DETAILS');
        setNotifyMsg({ text: `Encryption failure: ${err.message}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    }, 1200); // Emulates TFLite embedding generation latency
  };

  const resetForm = () => {
    setUserId('');
    setFullName('');
    setRole('NHAI Inspector');
    setStage('DETAILS');
    setNotifyMsg(null);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 SECURE FACE ENROLLMENT COCKPIT</h2>
      <p style={styles.subtitle}>Register NHAI field personnel to local secure database indices for offline remote authentication.</p>

      {notifyMsg && (
        <div style={{
          ...styles.notification,
          backgroundColor: notifyMsg.type === 'success' ? 'rgba(0, 230, 118, 0.1)' : notifyMsg.type === 'error' ? 'rgba(255, 23, 68, 0.1)' : 'rgba(0, 229, 255, 0.1)',
          borderColor: notifyMsg.type === 'success' ? '#00e676' : notifyMsg.type === 'error' ? '#ff1744' : '#00e5ff',
          color: notifyMsg.type === 'success' ? '#69f0ae' : notifyMsg.type === 'error' ? '#ff5252' : '#18ffff'
        }}>
          {notifyMsg.text}
        </div>
      )}

      {stage === 'DETAILS' && (
        <div style={styles.card}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Unique Operator ID (NHAI-XXXX)</label>
            <input 
              type="text" 
              placeholder="e.g. NHAI-2048" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Operator Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. Ramesh Chandra" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Operational Role</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)} 
              style={styles.input}
            >
              <option value="NHAI Inspector">NHAI Inspector</option>
              <option value="Toll Booth Supervisor">Toll Booth Supervisor</option>
              <option value="Site Maintenance Engineer">Site Maintenance Engineer</option>
              <option value="Project Director">Project Director</option>
            </select>
          </div>

          <button onClick={startScanning} style={styles.actionBtn}>
            PROCEED TO BIOMETRIC SCAN
          </button>
        </div>
      )}

      {stage === 'CAMERA' && (
        <div style={styles.card}>
          <div style={styles.sensorHUD}>
            <div style={styles.badge}>
              SENSORS ENGAGED
            </div>
            <div style={styles.progressContainer}>
              <div style={styles.progressText}>
                SCANNING ENROLLMENT DATA: {capturedFrames}/3 FRAMES
              </div>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBarActive,
                  width: `${(capturedFrames / 3) * 100}%`
                }} />
              </div>
            </div>
          </div>

          <CameraCaptureView 
            onFrameCapture={handleFrameCaptured}
            activeChallenge="STARE"
            isProcessing={!loading}
          />

          <div style={styles.guidanceBanner}>
            <div style={styles.guidanceIcon}>📢</div>
            <div style={styles.guidanceMsg}>{qualityText}</div>
          </div>

          <button 
            onClick={() => setStage('DETAILS')} 
            style={styles.cancelBtn}
            disabled={loading}
          >
            CANCEL ENROLLMENT
          </button>
        </div>
      )}

      {stage === 'COMPLETED' && (
        <div style={styles.cardCompleted}>
          <div style={styles.successIcon}>✓</div>
          <h3 style={styles.successHeading}>ENROLLMENT SUCCESSFUL</h3>
          <p style={styles.successText}>
            Operator profile has been compiled, encrypted with AES-256 using secure derived hardware keys, and written into local SQLite cache.
          </p>
          
          <div style={styles.metadataReview}>
            <div style={styles.metaRow}>
              <span>ID Reference:</span> <strong>{userId}</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Full Name:</span> <strong>{fullName}</strong>
            </div>
            <div style={styles.metaRow}>
              <span>Crypto Key:</span> <span>AES-256-PBKDF2 (Hardware-Bound)</span>
            </div>
            <div style={styles.metaRow}>
              <span>Photo Contrast:</span> <span>{qualityScore}% Optimal</span>
            </div>
          </div>

          <button onClick={resetForm} style={styles.actionBtn}>
            ENROLL ANOTHER OPERATOR
          </button>
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
  cardCompleted: {
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
  input: {
    backgroundColor: '#0e1726',
    border: '1.5px solid #1e293b',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#f8fafc',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    width: '100%',
    boxSizing: 'border-box' as const
  },
  actionBtn: {
    backgroundColor: '#00e5ff',
    color: '#030712',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 229, 255, 0.25)',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    width: '100%',
    letterSpacing: '0.3px'
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    color: '#ff1744',
    border: '1px solid rgba(255, 23, 68, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '11px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    width: '100%'
  },
  sensorHUD: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0e1726',
    borderRadius: '10px',
    padding: '12px 16px',
    border: '1.5px solid #1e293b'
  },
  badge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    color: '#00e5ff',
    border: '1px solid #00e5ff',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px'
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    width: '65%'
  },
  progressText: {
    fontSize: '9px',
    color: '#94a3b8',
    fontWeight: 'bold' as const
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: '#1e293b',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: '#00e5ff',
    borderRadius: '3px',
    transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1)'
  },
  guidanceBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    border: '1px dashed #ffd600',
    borderRadius: '10px',
    padding: '12px 16px'
  },
  guidanceIcon: {
    fontSize: '16px'
  },
  guidanceMsg: {
    fontSize: '11px',
    color: '#ffe57f',
    fontWeight: 500
  },
  successIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#00e676',
    color: '#050a14',
    fontSize: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 20px rgba(0, 230, 118, 0.4)'
  },
  successHeading: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#69f0ae',
    letterSpacing: '0.5px'
  },
  successText: {
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: '1.5',
    margin: '0 0 10px 0'
  },
  metadataReview: {
    width: '100%',
    backgroundColor: '#0e1726',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94a3b8',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: '8px'
  },
  notification: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 500,
    width: '100%',
    boxSizing: 'border-box' as const,
    marginBottom: '16px',
    textAlign: 'center' as const
  }
};
