import { VerificationEvent } from '../types';
import SecureBiometricDatabase from './db';
import PurgeEngine from './purge';

/**
 * NHAI Offline Transaction Sync & Secure Queue Service
 * 
 * Works 100% offline-first:
 * - Detects active network status.
 * - Stores failed or zero-network transactions securely in the DB queue.
 * - Simulates cryptographically validated REST uploads to AWS S3/API Gateway when online.
 * - Dispatches verification receipts to the Purge Engine to release local memory buffers.
 */

export class SyncEngine {
  private static instance: SyncEngine;
  private db = SecureBiometricDatabase.getInstance();
  private isSyncing = false;
  private onlineStatus: 'ONLINE' | 'OFFLINE' = 'OFFLINE';

  private constructor() {}

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  /**
   * Sets device network state (Simulates react-native netinfo listeners)
   */
  public setNetworkStatus(status: 'ONLINE' | 'OFFLINE'): void {
    const statusChanged = this.onlineStatus !== status;
    this.onlineStatus = status;
    
    if (statusChanged) {
      console.log(`[SYNC ENGINE] Network status changed to: ${status}`);
      if (status === 'ONLINE') {
        // Trigger automated queue syncing immediately when link is re-established
        this.syncPendingQueue();
      }
    }
  }

  public getNetworkStatus(): 'ONLINE' | 'OFFLINE' {
    return this.onlineStatus;
  }

  /**
   * Dispatches biometric verification result logs to local offline database queue
   */
  public logVerificationAttempt(
    userId: string, 
    result: VerificationEvent['result'],
    matchScore: number,
    livenessScore: number,
    totalLatencyMs: number,
    modelLatencyMs: number,
    livenessLatencyMs: number
  ): VerificationEvent {
    const event: VerificationEvent = {
      eventId: `EV-${Math.floor(Math.random() * 900000) + 100000}-${Date.now().toString().slice(-4)}`,
      userId,
      timestamp: new Date().toISOString(),
      result,
      matchScore,
      livenessScore,
      overallLatencyMs: totalLatencyMs,
      modelLatencyMs,
      livenessLatencyMs,
      deviceInfo: {
        model: "Mid-Range Octa-Core Device",
        osVersion: "Android 11 / iOS 15",
        ramTotalGb: 4.0
      },
      syncStatus: 'QUEUED',
      syncAttempts: 0,
      appVersion: "Datalake_3.0-V1.2.0",
      modelVersion: "MobileFaceNet_v1.0_Quantized",
      livenessModelVersion: "LandmarkGesture_v1.4"
    };

    this.db.enqueueEvent(event);
    
    // Auto-trigger sync if currently online
    if (this.onlineStatus === 'ONLINE') {
      this.syncPendingQueue();
    }

    return event;
  }

  /**
   * Core Sync Loop: Connects to AWS Simulators and transmits queued events
   */
  public async syncPendingQueue(): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing) return { syncedCount: 0, failedCount: 0 };
    if (this.onlineStatus === 'OFFLINE') {
      console.log("[SYNC ENGINE] Device offline. Sync halted.");
      return { syncedCount: 0, failedCount: 0 };
    }

    const pending = this.db.getPendingQueue();
    if (pending.length === 0) {
      console.log("[SYNC ENGINE] Offline transaction queue is empty. Zero items to sync.");
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    console.log(`[SYNC ENGINE] Initiating secure upload of ${pending.length} events to AWS Gateway...`);

    let syncedCount = 0;
    let failedCount = 0;

    for (const event of pending) {
      event.syncAttempts += 1;
      
      const success = await this.uploadToAWSMock(event);
      if (success) {
        this.db.updateEventStatus(event.eventId, 'SYNCED', event.syncAttempts);
        syncedCount += 1;

        // Mandated Secure Wiping Protocol:
        // Once verification is officially recorded at the AWS datacenter, we purge
        // the local template credentials securely to maintain compliance.
        if (event.result === 'SUCCESS') {
          // Purge the biometric template of the validated user
          PurgeEngine.securelyPurgeUser(event.userId);
        }
      } else {
        this.db.updateEventStatus(event.eventId, 'FAILED_RETRY', event.syncAttempts);
        failedCount += 1;
      }
    }

    // Clean historical logs
    this.db.purgeSyncedEvents();
    
    this.isSyncing = false;
    console.log(`[SYNC ENGINE] Batch Sync complete. Synced: ${syncedCount}, Retries: ${failedCount}`);
    return { syncedCount, failedCount };
  }

  /**
   * HTTPS AWS REST Connector Simulator
   * Simulates full signature hashing, transport security, and cryptographically signed server receipts
   */
  private async uploadToAWSMock(event: VerificationEvent): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulate real-world network transmission delays
      setTimeout(() => {
        // High likelihood of transmission success under normal online states
        const hashPayload = btoa(JSON.stringify(event)).slice(-16);
        const serverReceiptVerificationHash = `SHA256-ACK-${hashPayload.toUpperCase()}`;
        
        console.log(`[AWS CLOUD] Event ${event.eventId} successfully synced. Hash Receipt: ${serverReceiptVerificationHash}`);
        resolve(true);
      }, 750);
    });
  }
}
export default SyncEngine;
