/**
 * NHAI Offline Biometric Authentication System
 * High-Fidelity Type Definitions
 * 
 * This file contains strictly typed interfaces for system configurations,
 * biometric models, active liveness states, secure databases, and audit logs.
 */

export interface UserProfile {
  userId: string;
  name: string;
  role: string;
  enrolledAt: string;
  modelV: string;
  // Encrypted base64 representation of 128-D float vector
  encryptedTemplate: string;
  salt: string; // Dynamic salt used for AES-256 key derivation
  photoQualityScore: number;
}

export interface BiometricMatchResult {
  isMatch: boolean;
  score: number;
  threshold: number;
  latencyMs: number;
  matchAlgorithm: 'Cosine' | 'Euclidean';
}

export type LivenessChallengeType = 'BLINK' | 'SMILE' | 'TURN_LEFT' | 'TURN_RIGHT' | 'STARE';

export interface LivenessState {
  currentChallenge: LivenessChallengeType;
  challengeSequence: LivenessChallengeType[];
  currentIndex: number;
  progress: number; // 0 to 1
  isPassed: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';
  gestureLogs: {
    challenge: LivenessChallengeType;
    latencyMs: number;
    score: number;
  }[];
}

export interface VerificationEvent {
  eventId: string;
  userId: string;
  timestamp: string;
  result: 'SUCCESS' | 'FAILED_MATCH' | 'FAILED_LIVENESS' | 'FAILED_QUALITY';
  matchScore: number;
  livenessScore: number;
  overallLatencyMs: number;
  modelLatencyMs: number;
  livenessLatencyMs: number;
  deviceInfo: {
    model: string;
    osVersion: string;
    ramTotalGb: number;
  };
  syncStatus: 'QUEUED' | 'SYNCED' | 'FAILED_RETRY';
  syncAttempts: number;
  appVersion: string;
  modelVersion: string;
  livenessModelVersion: string;
}

export interface SecurityConfig {
  encryptionAlgorithm: 'AES-256-GCM';
  passcodeIterations: number;
  keySizeBits: number;
  dynamicSalting: boolean;
  securePurgePasses: number; // e.g. 3 passes for DoD compliance
}

export interface SystemDiagnostics {
  modelName: string;
  modelSizeMB: number;
  quantizationType: 'INT8' | 'FP16' | 'FP32';
  averageInferenceTimeMs: number;
  averageLivenessTimeMs: number;
  totalVerifications: number;
  successRate: number;
  spoofPreventionCount: number;
  freeRAM_MB: number;
  batteryDrainFactor: number;
  networkStatus: 'ONLINE' | 'OFFLINE';
}

export interface CameraFrameMetadata {
  width: number;
  height: number;
  brightness: number; // For outdoor quality checks
  sharpness: number;  // For motion blur rejection
  yawAngle: number;   // Head turn validation (degrees)
  pitchAngle: number; // Head pitch validation (degrees)
  rollAngle: number;  // Head roll validation (degrees)
  leftEyeOpenProb: number;
  rightEyeOpenProb: number;
  smileProb: number;
}
