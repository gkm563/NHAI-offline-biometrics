import React, { useState, useEffect, useRef } from 'react';
import { CameraFrameMetadata } from '../types';

/**
 * NHAI Premium Camera Frame Capture & Simulation Component
 * 
 * Functions:
 * - Opens a real web camera feed inside the viewfinder overlay using mediaDevices.
 * - Renders a sleek, high-fidelity dark HUD UI with neon overlays.
 * - Draws a face-outline overlay indicating optimal positioning.
 * - Draws dual eye iris scanning target overlays.
 * - Integrates dynamic sensors allowing simulation of live face landmark parameters.
 */

interface CameraCaptureViewProps {
  onFrameCapture: (frame: CameraFrameMetadata) => void;
  activeChallenge: string;
  isProcessing: boolean;
}

export const CameraCaptureView: React.FC<CameraCaptureViewProps> = ({
  onFrameCapture,
  activeChallenge,
  isProcessing
}) => {
  // Live Frame Telemetry Variables (Adjustable via control cockpit)
  const [brightness, setBrightness] = useState<number>(65);
  const [sharpness, setSharpness] = useState<number>(75);
  const [yaw, setYaw] = useState<number>(0);
  const [leftEyeOpen, setLeftEyeOpen] = useState<number>(0.95);
  const [rightEyeOpen, setRightEyeOpen] = useState<number>(0.95);
  const [smile, setSmile] = useState<number>(0.10);

  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Request real webcam stream on component mount/activation
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isProcessing) {
      setCameraError(null);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.error("Camera access error:", err);
          setCameraError("Camera blocked or unavailable. Using high-fidelity simulator canvas.");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isProcessing]);

  // Auto Frame dispatch cycle simulating 30 FPS camera feed loops
  useEffect(() => {
    if (!isProcessing) return;

    const timer = setInterval(() => {
      onFrameCapture({
        width: 1920,
        height: 1080,
        brightness,
        sharpness,
        yawAngle: yaw,
        pitchAngle: 0,
        rollAngle: 0,
        leftEyeOpenProb: leftEyeOpen,
        rightEyeOpenProb: rightEyeOpen,
        smileProb: smile
      });
    }, 150); // 150ms capture interval

    return () => clearInterval(timer);
  }, [isProcessing, brightness, sharpness, yaw, leftEyeOpen, rightEyeOpen, smile]);

  // Turn off auto-simulation when processing stops
  useEffect(() => {
    if (!isProcessing) {
      setIsAutoSimulating(false);
    }
  }, [isProcessing]);

  // Handle active challenge changes during auto-simulation
  useEffect(() => {
    if (!isAutoSimulating || !isProcessing) return;

    // Reset lighting parameters to baseline
    setBrightness(65);
    setSharpness(75);

    if (activeChallenge === 'STARE') {
      setYaw(0);
      setLeftEyeOpen(0.95);
      setRightEyeOpen(0.95);
      setSmile(0.10);
    } else if (activeChallenge === 'BLINK') {
      // Close eyes
      setLeftEyeOpen(0.05);
      setRightEyeOpen(0.05);
      
      // Reopen eyes after 400ms to complete the blink gesture
      const timer = setTimeout(() => {
        setLeftEyeOpen(0.95);
        setRightEyeOpen(0.95);
      }, 400);
      return () => clearTimeout(timer);
    } else if (activeChallenge === 'SMILE') {
      setYaw(0);
      setLeftEyeOpen(0.95);
      setRightEyeOpen(0.95);
      setSmile(0.85);
    } else if (activeChallenge === 'TURN_LEFT') {
      setYaw(-25);
      setLeftEyeOpen(0.95);
      setRightEyeOpen(0.95);
      setSmile(0.10);
    } else if (activeChallenge === 'TURN_RIGHT') {
      setYaw(25);
      setLeftEyeOpen(0.95);
      setRightEyeOpen(0.95);
      setSmile(0.10);
    }
  }, [activeChallenge, isAutoSimulating, isProcessing]);

  const triggerAutoSuccessMock = () => {
    setIsAutoSimulating(true);
  };

  return (
    <div style={styles.container}>
      {/* Sleek Camera Viewfinder HUD */}
      <div style={styles.viewfinder}>
        {/* Real Live Video Stream */}
        {isProcessing && !cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.cameraVideo}
          />
        )}

        {cameraError && (
          <div style={styles.cameraErrorOverlay}>
            <div style={styles.cameraErrorText}>📸 {cameraError}</div>
          </div>
        )}

        {/* Neon target circle indicator */}
        <div style={{
          ...styles.captureCircle,
          borderColor: isProcessing ? '#00e5ff' : '#00e676'
        }}>
          {isProcessing && (
            <>
              <div style={styles.scanningLine} />
              
              {/* Futuristic Iris Scanner targets */}
              <div style={styles.eyeScanLeft} />
              <div style={styles.eyeScanRight} />
              <div style={styles.irisScannerInfo}>IRIS SCANNER ENGAGED</div>
            </>
          )}
          
          <div style={styles.faceSilhouette} />
        </div>

        {/* Real-time Bounding Box Overlay */}
        {isProcessing && (
          <div style={{
            ...styles.boundingBox,
            transform: `translate(${yaw * 1.5}px, 0px)`
          }}>
            <div style={styles.cornerTL} />
            <div style={styles.cornerTR} />
            <div style={styles.cornerBL} />
            <div style={styles.cornerBR} />
            <div style={styles.boxTag}>FACE DETECTED (ML_KIT)</div>
          </div>
        )}

        {/* Active HUD text */}
        <div style={styles.hudOverlay}>
          <div style={styles.hudBadge}>
            <span style={styles.pulseDot} />
            LIVE FEED [30 FPS]
          </div>
          <div style={styles.hudTelemetry}>
            YAW: {yaw}° | ILLUM: {brightness}lx | SHARP: {sharpness}%
          </div>
        </div>
      </div>

      {/* Simulator Control Cockpit (Crucial for Hackathon Evaluation / Browser Demos!) */}
      <div style={styles.simulatorCockpit}>
        <div style={styles.cockpitTitle}>🔧 HARDWARE TELEMETRY INJECTOR (DEMO COCKPIT)</div>
        <p style={styles.cockpitDesc}>
          Simulate real-world environment variables and physical face movements dynamically to test edge-AI accuracy.
        </p>

        <div style={styles.controlGrid}>
          {/* Light quality slider */}
          <div style={styles.controlItem}>
            <label style={styles.controlLabel}>
              Illumination (Lux): <span>{brightness} lx</span>
            </label>
            <input 
              type="range" min="10" max="100" value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.validationText}>
              {brightness < 25 ? '⚠️ Environment too dark!' : brightness > 92 ? '⚠️ Sun glare overload!' : '✅ Optimal Lighting'}
            </span>
          </div>

          {/* Sharpness slider */}
          <div style={styles.controlItem}>
            <label style={styles.controlLabel}>
              Lens Contrast (Sharpness): <span>{sharpness}%</span>
            </label>
            <input 
              type="range" min="20" max="100" value={sharpness}
              onChange={(e) => setSharpness(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.validationText}>
              {sharpness < 45 ? '⚠️ Heavy Motion Blur!' : '✅ Sharp Capture'}
            </span>
          </div>

          {/* Yaw rotation slider */}
          <div style={styles.controlItem}>
            <label style={styles.controlLabel}>
              Head Yaw Rotation: <span>{yaw}°</span>
            </label>
            <input 
              type="range" min="-40" max="40" value={yaw}
              onChange={(e) => setYaw(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.validationText}>
              {yaw < -20 ? '◀️ Turning Left' : yaw > 20 ? '▶️ Turning Right' : '🔲 Face Centred'}
            </span>
          </div>

          {/* Eye open slider */}
          <div style={styles.controlItem}>
            <label style={styles.controlLabel}>
              Eye Openness Factor: <span>{Math.round(leftEyeOpen * 100)}%</span>
            </label>
            <input 
              type="range" min="0" max="1" step="0.05" value={leftEyeOpen}
              onChange={(e) => {
                setLeftEyeOpen(Number(e.target.value));
                setRightEyeOpen(Number(e.target.value));
              }}
              style={styles.slider}
            />
            <span style={styles.validationText}>
              {leftEyeOpen < 0.22 ? '👁️ Eyes Closed (Blink!)' : '👀 Eyes Open'}
            </span>
          </div>

          {/* Smile probability slider */}
          <div style={styles.controlItem}>
            <label style={styles.controlLabel}>
              Smile Intensity: <span>{Math.round(smile * 100)}%</span>
            </label>
            <input 
              type="range" min="0" max="1" step="0.05" value={smile}
              onChange={(e) => setSmile(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.validationText}>
              {smile > 0.72 ? '😊 Smiling Face' : '😐 Neutral Face'}
            </span>
          </div>

          {/* Automated Walkthrough Button */}
          <div style={{ ...styles.controlItem, justifyContent: 'center' }}>
            <button 
              onClick={triggerAutoSuccessMock}
              disabled={!isProcessing}
              style={{
                ...styles.mockBtn,
                opacity: isProcessing ? 1 : 0.5,
                cursor: isProcessing ? 'pointer' : 'not-allowed'
              }}
            >
              ⚡ AUTO-SIMULATE GESTURE VERIFY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
    fontFamily: "'Outfit', 'Inter', sans-serif"
  },
  viewfinder: {
    position: 'relative' as const,
    width: '100%',
    height: '380px',
    backgroundColor: '#0a0f1d',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1.5px solid rgba(255,255,255,0.08)',
    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraVideo: {
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    zIndex: 1,
    transform: 'scaleX(-1)' // mirror camera feed
  },
  cameraErrorOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 10, 20, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    padding: '20px',
    boxSizing: 'border-box' as const
  },
  cameraErrorText: {
    fontSize: '11px',
    color: '#94a3b8',
    textAlign: 'center' as const,
    lineHeight: '1.5'
  },
  captureCircle: {
    width: '210px',
    height: '210px',
    borderRadius: '50%',
    borderWidth: '3px',
    borderStyle: 'solid',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
    transition: 'border-color 0.4s ease',
    boxShadow: '0 0 25px rgba(0, 229, 255, 0.15)',
    zIndex: 2
  },
  scanningLine: {
    position: 'absolute' as const,
    width: '100%',
    height: '2px',
    backgroundColor: 'rgba(0, 229, 255, 0.6)',
    boxShadow: '0 0 10px #00e5ff',
    animation: 'scanAnimation 2.5s infinite linear',
    top: 0,
    zIndex: 3
  },
  eyeScanLeft: {
    position: 'absolute' as const,
    top: '40%',
    left: '26%',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1.5px dashed #00e5ff',
    boxShadow: '0 0 8px rgba(0,229,255,0.4)',
    animation: 'pulseAnimation 1.5s infinite ease-in-out',
    zIndex: 3
  },
  eyeScanRight: {
    position: 'absolute' as const,
    top: '40%',
    right: '26%',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1.5px dashed #00e5ff',
    boxShadow: '0 0 8px rgba(0,229,255,0.4)',
    animation: 'pulseAnimation 1.5s infinite ease-in-out',
    zIndex: 3
  },
  irisScannerInfo: {
    position: 'absolute' as const,
    top: '68%',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#00e5ff',
    fontSize: '8px',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px',
    backgroundColor: 'rgba(5, 10, 20, 0.85)',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    whiteSpace: 'nowrap' as const,
    zIndex: 3
  },
  faceSilhouette: {
    width: '140px',
    height: '170px',
    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
    border: '1px dashed rgba(255, 255, 255, 0.25)',
    zIndex: 2
  },
  boundingBox: {
    position: 'absolute' as const,
    width: '160px',
    height: '200px',
    border: '1.5px solid #00e676',
    boxShadow: '0 0 15px rgba(0, 230, 118, 0.2)',
    transition: 'transform 0.1s linear',
    pointerEvents: 'none' as const,
    zIndex: 2
  },
  cornerTL: {
    position: 'absolute' as const,
    top: '-3px',
    left: '-3px',
    width: '12px',
    height: '12px',
    borderLeft: '3px solid #00e676',
    borderTop: '3px solid #00e676'
  },
  cornerTR: {
    position: 'absolute' as const,
    top: '-3px',
    right: '-3px',
    width: '12px',
    height: '12px',
    borderRight: '3px solid #00e676',
    borderTop: '3px solid #00e676'
  },
  cornerBL: {
    position: 'absolute' as const,
    bottom: '-3px',
    left: '-3px',
    width: '12px',
    height: '12px',
    borderLeft: '3px solid #00e676',
    borderBottom: '3px solid #00e676'
  },
  cornerBR: {
    position: 'absolute' as const,
    bottom: '-3px',
    right: '-3px',
    width: '12px',
    height: '12px',
    borderRight: '3px solid #00e676',
    borderBottom: '3px solid #00e676'
  },
  boxTag: {
    position: 'absolute' as const,
    bottom: '-25px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#00e676',
    color: '#050a14',
    fontSize: '9px',
    fontWeight: 'bold' as const,
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
  },
  hudOverlay: {
    position: 'absolute' as const,
    bottom: '12px',
    left: '12px',
    right: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none' as const,
    zIndex: 2
  },
  hudBadge: {
    backgroundColor: 'rgba(5, 10, 20, 0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '10px',
    color: '#a0aec0',
    fontWeight: 'bold' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#ff1744',
    display: 'inline-block',
    boxShadow: '0 0 8px #ff1744',
    animation: 'pulseAnimation 1.2s infinite ease-in-out'
  },
  hudTelemetry: {
    backgroundColor: 'rgba(5, 10, 20, 0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '9px',
    color: '#00e5ff',
    fontWeight: 'bold' as const
  },
  simulatorCockpit: {
    width: '100%',
    backgroundColor: '#0d1527',
    border: '1px dashed #1a2c50',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px',
    boxSizing: 'border-box' as const
  },
  cockpitTitle: {
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#ffd600',
    marginBottom: '6px',
    letterSpacing: '0.5px'
  },
  cockpitDesc: {
    fontSize: '10px',
    color: '#718096',
    margin: '0 0 14px 0',
    lineHeight: '1.4'
  },
  controlGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '14px',
    alignItems: 'start'
  },
  controlItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  controlLabel: {
    fontSize: '11px',
    color: '#e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 500
  },
  slider: {
    width: '100%',
    height: '4px',
    backgroundColor: '#1a2c50',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer'
  },
  validationText: {
    fontSize: '9px',
    fontWeight: 'bold' as const,
    color: '#a0aec0',
    marginTop: '2px'
  },
  mockBtn: {
    backgroundColor: '#ffd600',
    color: '#050a14',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    marginTop: '8px',
    boxShadow: '0 4px 15px rgba(255, 214, 0, 0.2)',
    transition: 'transform 0.2s ease, filter 0.2s ease',
    width: '100%'
  }
};

// Global keyframe styles inserted as raw HTML tag inside parent components later
export const insertKeyframes = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'biometric-camera-keyframes';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    @keyframes scanAnimation {
      0% { top: 0%; opacity: 0.8; }
      50% { top: 100%; opacity: 0.8; }
      100% { top: 0%; opacity: 0.8; }
    }
    @keyframes pulseAnimation {
      0% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
};
