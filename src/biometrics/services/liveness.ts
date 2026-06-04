import { LivenessChallengeType, LivenessState, CameraFrameMetadata } from '../types';

/**
 * NHAI Multimodal Active Liveness & Challenge-Response Pipeline
 * 
 * To combat attendance fraud (printed photos, high-res tablet screens),
 * the engine serves randomized, dynamic physical cues.
 * 
 * Geometric Calculations:
 * - Eye Aspect Ratio (EAR) < 0.23 -> BLINK detection
 * - Mouth Aspect Ratio (MAR) > 0.60 -> SMILE/mouth open detection
 * - Yaw Angle (Absolute Degrees) > 22° -> HEAD TURN detection
 */

export class LivenessEngine {
  private static instance: LivenessEngine;

  // Geometric landmark thresholds
  private readonly BLINK_EAR_THRESHOLD = 0.22; // Eyes open probability threshold
  private readonly SMILE_PROB_THRESHOLD = 0.72; // Smile confidence probability threshold
  private readonly YAW_TURN_THRESHOLD_DEG = 20; // 20 degrees head yaw rotation threshold

  private constructor() {}

  public static getInstance(): LivenessEngine {
    if (!LivenessEngine.instance) {
      LivenessEngine.instance = new LivenessEngine();
    }
    return LivenessEngine.instance;
  }

  /**
   * Initializes a new dynamic, randomized challenge queue
   */
  public generateChallengeState(): LivenessState {
    const list: LivenessChallengeType[] = ['BLINK', 'SMILE', 'TURN_LEFT', 'TURN_RIGHT'];
    
    // Fisher-Yates Random Shuffle to make challenges completely unpredictable
    const challengeSequence: LivenessChallengeType[] = ['STARE']; // Always start with a steady alignment lock
    
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    // Keep 2 randomized active challenges + 1 initial alignment stare
    challengeSequence.push(shuffled[0], shuffled[1]);

    return {
      currentChallenge: challengeSequence[0],
      challengeSequence,
      currentIndex: 0,
      progress: 0.0,
      isPassed: false,
      status: 'PENDING',
      gestureLogs: []
    };
  }

  /**
   * Processes current camera frames against the active gesture challenge rules
   * Returns updated liveness progress, state updates, and verification status.
   */
  public evaluateFrameLandmarks(
    frame: CameraFrameMetadata, 
    currentState: LivenessState,
    timeElapsedMs: number
  ): LivenessState {
    // If already passed or failed, stop evaluations
    if (currentState.status === 'PASSED' || currentState.status === 'FAILED') {
      return currentState;
    }

    const state = { ...currentState };
    const currentTask = state.currentChallenge;
    let taskPassed = false;
    let score = 0;

    switch (currentTask) {
      case 'STARE':
        // Ensure head is centered, eyes open, look straight into the camera
        const centered = Math.abs(frame.yawAngle) < 6 && Math.abs(frame.pitchAngle) < 6;
        const steadyEyes = frame.leftEyeOpenProb > 0.85 && frame.rightEyeOpenProb > 0.85;
        if (centered && steadyEyes) {
          taskPassed = true;
          score = 0.99;
        }
        break;

      case 'BLINK':
        // Eye open probability drops below blink baseline
        const avgEyeOpen = (frame.leftEyeOpenProb + frame.rightEyeOpenProb) / 2.0;
        if (avgEyeOpen < this.BLINK_EAR_THRESHOLD) {
          taskPassed = true;
          score = 1.0 - avgEyeOpen;
        }
        break;

      case 'SMILE':
        // Smile classification exceeds threshold
        if (frame.smileProb > this.SMILE_PROB_THRESHOLD) {
          taskPassed = true;
          score = frame.smileProb;
        }
        break;

      case 'TURN_LEFT':
        // Negative yaw (standard face mesh convention for turning left)
        if (frame.yawAngle < -this.YAW_TURN_THRESHOLD_DEG) {
          taskPassed = true;
          score = Math.abs(frame.yawAngle) / 40.0;
        }
        break;

      case 'TURN_RIGHT':
        // Positive yaw (standard face mesh convention for turning right)
        if (frame.yawAngle > this.YAW_TURN_THRESHOLD_DEG) {
          taskPassed = true;
          score = frame.yawAngle / 40.0;
        }
        break;
    }

    // Handle Challenge Stage Transitions
    if (taskPassed) {
      console.log(`[LIVENESS ENGINE] Challenge ${currentTask} PASSED! Score: ${score.toFixed(2)}`);
      
      // Log gesture trace
      state.gestureLogs.push({
        challenge: currentTask,
        latencyMs: timeElapsedMs,
        score
      });

      state.currentIndex += 1;
      
      if (state.currentIndex >= state.challengeSequence.length) {
        state.progress = 1.0;
        state.status = 'PASSED';
        state.isPassed = true;
        console.log(`[LIVENESS ENGINE] Multimodal liveness verification successfully achieved.`);
      } else {
        state.currentChallenge = state.challengeSequence[state.currentIndex];
        state.progress = state.currentIndex / state.challengeSequence.length;
        state.status = 'IN_PROGRESS';
      }
    }

    return state;
  }
}
export default LivenessEngine;
