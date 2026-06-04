import { useState, useEffect, useRef } from 'react';
import { LivenessState, CameraFrameMetadata, BiometricMatchResult } from '../types';
import LivenessEngine from '../services/liveness';
import BiometricEngine from '../services/biometrics';
import SyncEngine from '../services/sync';
import DiagnosticsService from '../services/diagnostics';

/**
 * NHAI Unified Custom React Hook: useBiometricVerify
 * 
 * Orchestrates:
 * 1. Visual frame analysis loop from the native camera stream.
 * 2. Real-time illumination and sharpness checks.
 * 3. Dynamic active liveness gesture challenge state transitions.
 * 4. Multi-modal matching (Cosine vector comparison of 128-D templates).
 * 5. Instant synchronization queuing and secure biometric purging.
 */

export interface BiometricHookProps {
  userId: string;
  onSuccess: (result: BiometricMatchResult) => void;
  onFailure: (reason: string) => void;
}

export function useBiometricVerify({ userId, onSuccess, onFailure }: BiometricHookProps) {
  const livenessEngine = LivenessEngine.getInstance();
  const biometricEngine = BiometricEngine.getInstance();
  const syncEngine = SyncEngine.getInstance();
  const diagnostics = DiagnosticsService.getInstance();

  // React component state
  const [livenessState, setLivenessState] = useState<LivenessState>(livenessEngine.generateChallengeState());
  const [frameQualityText, setFrameQualityText] = useState<string>('Align face inside the circle.');
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [currentVerificationProgress, setCurrentVerificationProgress] = useState<number>(0);

  // Time metrics tracking refs
  const livenessStartTimeRef = useRef<number>(Date.now());
  const absoluteStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Reset state machines upon instantiation
    setLivenessState(livenessEngine.generateChallengeState());
    livenessStartTimeRef.current = Date.now();
    absoluteStartTimeRef.current = Date.now();
    setIsProcessing(true);
    addLog("System initialized. Calibrating camera sensors...");
  }, [userId]);

  const addLog = (message: string) => {
    console.log(`[HOOK LOG] ${message}`);
    setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 15)]);
  };

  /**
   * Continuous Camera Frame Processing Hook
   * Receives coordinates from Android ML Kit / iOS Apple Vision native frames
   */
  const processIncomingFrame = (frame: CameraFrameMetadata) => {
    if (!isProcessing || livenessState.status === 'PASSED' || livenessState.status === 'FAILED') {
      return;
    }

    // Phase 1: Real-time lighting and blur validation
    const quality = biometricEngine.checkFrameQuality(frame.brightness, frame.sharpness);
    if (!quality.passed) {
      setFrameQualityText(quality.reason || 'Frame quality low.');
      return;
    }
    setFrameQualityText('Perfect lighting. Keep steady.');

    const timeSinceLivenessStart = Date.now() - livenessStartTimeRef.current;

    // Phase 2: Feed coordinates into Active Liveness challenge-response engine
    const nextLivenessState = livenessEngine.evaluateFrameLandmarks(
      frame,
      livenessState,
      timeSinceLivenessStart
    );

    // Update state to render visual indicators (e.g. blinking icons, progress bars)
    setLivenessState(nextLivenessState);
    setCurrentVerificationProgress(nextLivenessState.progress * 0.7); // Liveness counts for 70% progress

    if (nextLivenessState.currentChallenge !== livenessState.currentChallenge) {
      addLog(`Liveness Stage Completed: ${livenessState.currentChallenge}. Next Task: ${nextLivenessState.currentChallenge}`);
    }

    // Phase 3: Check if dynamic liveness sequence successfully passed
    if (nextLivenessState.isPassed && nextLivenessState.status === 'PASSED') {
      setIsProcessing(false); // Halt frame parsing to prevent parallel inferences
      addLog("Multimodal liveness authenticated. Extracting facial embeddings...");
      
      const livenessDuration = Date.now() - livenessStartTimeRef.current;
      setCurrentVerificationProgress(0.85); // Embedding extraction progress

      // Simulate local MobileFaceNet model forward vector pass (INT8 inference)
      setTimeout(() => {
        const inferenceStart = Date.now();
        
        // Generate embedding vector based on simulated user face matching
        const liveEmbedding = biometricEngine.runLocalInferenceMock(userId, false);
        const inferenceDuration = Date.now() - inferenceStart;
        
        addLog(`MobileFaceNet forward pass finished in ${inferenceDuration}ms. Vector normalised.`);
        setCurrentVerificationProgress(0.95);

        // Perform security vector alignment match against local DB profiles
        const matchResult = biometricEngine.verifyIdentity(userId, liveEmbedding);
        const totalDuration = Date.now() - absoluteStartTimeRef.current;

        setCurrentVerificationProgress(1.0); // 100% completed
        
        // Update local diagnostics cache
        diagnostics.logMetrics(inferenceDuration, livenessDuration, false);

        if (matchResult.isMatch) {
          addLog(`Verification SUCCESS. Cosine similarity score: ${matchResult.score.toFixed(4)}`);
          
          // Log offline event transaction
          syncEngine.logVerificationAttempt(
            userId,
            'SUCCESS',
            matchResult.score,
            1.0, // perfect liveness score
            totalDuration,
            inferenceDuration,
            livenessDuration
          );

          onSuccess(matchResult);
        } else {
          addLog(`Verification REJECTED. Match score (${matchResult.score.toFixed(4)}) below secure threshold (${matchResult.threshold})`);
          
          syncEngine.logVerificationAttempt(
            userId,
            'FAILED_MATCH',
            matchResult.score,
            1.0,
            totalDuration,
            inferenceDuration,
            livenessDuration
          );

          onFailure(`Security verification failed. Identity discrepancy detected.`);
        }
      }, 200); // 200ms processing threshold (TFLite cold-start latency emulation)
    }
  };

  /**
   * Helper to manually simulate spoof attacks to verify system robustness
   */
  const triggerManualSpoofFailure = () => {
    setIsProcessing(false);
    addLog("[SECURITY CONTROLS] Anti-spoofing alert: Screen replay / pixel reflection detected.");
    diagnostics.logMetrics(0, 0, true); // Log anti-spoof event
    
    const totalDuration = Date.now() - absoluteStartTimeRef.current;
    
    syncEngine.logVerificationAttempt(
      userId,
      'FAILED_LIVENESS',
      0.0,
      0.0,
      totalDuration,
      0,
      0
    );

    onFailure("Spoofing attempt intercepted. Local credentials protected.");
  };

  /**
   * Resets active hooks for a fresh verification cycle
   */
  const resetVerificationPipeline = () => {
    setLivenessState(livenessEngine.generateChallengeState());
    livenessStartTimeRef.current = Date.now();
    absoluteStartTimeRef.current = Date.now();
    setIsProcessing(true);
    setCurrentVerificationProgress(0);
    setFrameQualityText('Align face inside the circle.');
    addLog("Verification system rebooted. Dynamic cues randomized.");
  };

  return {
    livenessState,
    frameQualityText,
    systemLogs,
    isProcessing,
    currentVerificationProgress,
    processIncomingFrame,
    triggerManualSpoofFailure,
    resetVerificationPipeline
  };
}
export default useBiometricVerify;
