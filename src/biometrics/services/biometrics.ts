import { UserProfile, BiometricMatchResult } from '../types';
import SecureBiometricDatabase from './db';

/**
 * NHAI Face Matching, Embedding, & Optimization Engine
 * 
 * Functions:
 * - Cosine Similarity vector matching
 * - Euclidean Distance vector matching
 * - Face frame illumination and sharpness quality checks
 * - Dynamic decision threshold gates (FAR/FRR adjustments)
 * - MobileFaceNet TFLite local inference modeling simulation
 */

export class BiometricEngine {
  private static instance: BiometricEngine;
  private db = SecureBiometricDatabase.getInstance();

  // Dynamic decision configuration
  private COSINE_THRESHOLD = 0.83; // Baseline LFW verified security threshold
  private EUCLIDEAN_THRESHOLD = 0.65;

  private constructor() {}

  public static getInstance(): BiometricEngine {
    if (!BiometricEngine.instance) {
      BiometricEngine.instance = new BiometricEngine();
    }
    return BiometricEngine.instance;
  }

  /**
   * Modifies the security matching tolerance threshold at runtime (Admin Feature)
   */
  public updateThreshold(cosineThreshold: number): void {
    this.COSINE_THRESHOLD = cosineThreshold;
    console.log(`[BIOMETRIC ENGINE] Decisional matching threshold updated to: ${cosineThreshold}`);
  }

  public getThreshold(): number {
    return this.COSINE_THRESHOLD;
  }

  /**
   * Vector Math: Cosine Similarity
   * Cosine Similarity = (A • B) / (||A|| * ||B||)
   * Scores range from -1 (opposite) to +1 (perfect identity match).
   */
  public calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Dimension mismatch: vecA (${vecA.length}) != vecB (${vecB.length})`);
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0.0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Vector Math: Euclidean Distance
   * d(A,B) = sqrt(sum((Ai - Bi)^2))
   * Lower scores indicate high identity similarity.
   */
  public calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Dimension mismatch`);
    }

    let sumSquares = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares);
  }

  /**
   * Quality Checker: Rejects blurry, over-exposed, or dark frames early
   * Prevents false rejections due to poor ambient lighting.
   */
  public checkFrameQuality(brightness: number, sharpness: number): { passed: boolean; reason?: string } {
    // Standard illumination limits (Lux equivalents converted to 0-100 scale)
    const MIN_BRIGHTNESS = 25;
    const MAX_BRIGHTNESS = 92;
    // Edge-contrast blur thresholds
    const MIN_SHARPNESS = 45;

    if (brightness < MIN_BRIGHTNESS) {
      return { passed: false, reason: "Environment too dark. Move to a brighter area." };
    }
    if (brightness > MAX_BRIGHTNESS) {
      return { passed: false, reason: "Severe sunlight flare. Shield the camera lens." };
    }
    if (sharpness < MIN_SHARPNESS) {
      return { passed: false, reason: "Motion blur detected. Hold the device steady." };
    }

    return { passed: true };
  }

  /**
   * Offine Face Template Matcher
   * Retrieves the secure profile from local storage, decrypts its embedding,
   * performs similarity math, and evaluates verification state.
   */
  public verifyIdentity(userId: string, liveEmbedding: number[]): BiometricMatchResult {
    const startTime = Date.now();
    const profile = this.db.getUserProfile(userId);

    if (!profile) {
      return {
        isMatch: false,
        score: 0,
        threshold: this.COSINE_THRESHOLD,
        latencyMs: Date.now() - startTime,
        matchAlgorithm: 'Cosine'
      };
    }

    // Decrypt database biometric vector
    const storedEmbedding = this.db.decryptTemplate(profile.encryptedTemplate, profile.salt);
    
    // Calculate similarities
    const similarity = this.calculateCosineSimilarity(liveEmbedding, storedEmbedding);
    const isMatch = similarity >= this.COSINE_THRESHOLD;

    const latency = Date.now() - startTime;
    console.log(`[BIOMETRIC ENGINE] ID Match: ${isMatch ? "SUCCESS" : "REJECTED"} (Score: ${similarity.toFixed(4)}, Latency: ${latency}ms)`);

    return {
      isMatch,
      score: similarity,
      threshold: this.COSINE_THRESHOLD,
      latencyMs: latency,
      matchAlgorithm: 'Cosine'
    };
  }

  /**
   * Inference Engine Simulator (Simulating local TFLite runner for MobileFaceNet)
   * Generates a repeatable 128-D vector mapping for enrollment/testing
   */
  public runLocalInferenceMock(faceId: string, introduceNoise: boolean = false): number[] {
    // Generate static 128-D profile vector using string hash as base seed
    let seed = 0;
    for (let i = 0; i < faceId.length; i++) {
      seed += faceId.charCodeAt(i);
    }

    const vector: number[] = [];
    for (let i = 0; i < 128; i++) {
      // Repeatable pseudo-random mapping
      let value = Math.sin(seed + i);
      if (introduceNoise) {
        // Mock outdoor shadow/light variance
        value += (Math.random() - 0.5) * 0.08;
      }
      vector.push(value);
    }

    // L2 Vector Normalization (Required for cosine accuracy standardization)
    let sumSquares = vector.reduce((acc, val) => acc + val * val, 0);
    const norm = Math.sqrt(sumSquares);
    
    return vector.map(v => v / norm);
  }
}
export default BiometricEngine;
