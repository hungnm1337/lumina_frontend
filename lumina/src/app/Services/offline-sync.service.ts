import { Injectable } from '@angular/core';
import { OfflineStorageService, PendingSpeakingSubmission } from './offline-storage.service';
import { SpeakingService } from './speaking.service';
import { ToastService } from './toast.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  successCount: number;
  failedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    successCount: 0,
    failedCount: 0
  });

  public syncStatus$: Observable<SyncStatus> = this.syncStatusSubject.asObservable();
  private isSyncing = false;

  constructor(
    private offlineStorage: OfflineStorageService,
    private speakingService: SpeakingService,
    private toastService: ToastService
  ) {
    this.initOnlineListener();
    this.checkAndSyncOnInit();
  }

  /**
   * Initialize online/offline event listeners
   */
  private initOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Network online - starting sync');
      this.toastService.info('Kết nối mạng đã khôi phục. Đang đồng bộ dữ liệu...');
      this.syncPendingSubmissions();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineSync] Network offline');
      this.toastService.warning('Mất kết nối mạng. Bài làm sẽ được lưu tạm và tự động đồng bộ khi có mạng.');
    });
  }

  /**
   * Check and sync on service initialization
   */
  private async checkAndSyncOnInit(): Promise<void> {
    if (navigator.onLine) {
      const pending = await this.offlineStorage.getPendingSubmissions();
      if (pending.length > 0) {
        console.log('[OfflineSync] Found pending submissions on init:', pending.length);
        this.toastService.info(`Tìm thấy ${pending.length} bài chưa đồng bộ. Đang xử lý...`);
        await this.syncPendingSubmissions();
      }
    }
  }

  /**
   * Sync all pending submissions
   */
  async syncPendingSubmissions(): Promise<void> {
    if (this.isSyncing) {
      console.log('[OfflineSync] Already syncing, skipping');
      return;
    }

    if (!navigator.onLine) {
      console.log('[OfflineSync] Still offline, skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      const pending = await this.offlineStorage.getPendingSubmissions();

      if (pending.length === 0) {
        console.log('[OfflineSync] No pending submissions');
        this.isSyncing = false;
        return;
      }

      console.log('[OfflineSync] Starting sync for', pending.length, 'submissions');

      this.syncStatusSubject.next({
        isSyncing: true,
        pendingCount: pending.length,
        successCount: 0,
        failedCount: 0
      });

      let successCount = 0;
      let failedCount = 0;

      // Sort by timestamp (oldest first)
      pending.sort((a, b) => a.timestamp - b.timestamp);

      for (const submission of pending) {
        try {
          console.log('[OfflineSync] Syncing submission:', submission.questionId);

          // Submit to backend
          const result = await this.speakingService.submitSpeakingAnswer(
            submission.audioBlob,
            submission.questionId,
            submission.attemptId
          ).toPromise();

          if (result) {
            // Success - delete from offline storage
            await this.offlineStorage.deletePendingSubmission(submission.questionId);
            successCount++;

            console.log('[OfflineSync] Successfully synced:', submission.questionId);

            // Update status
            this.syncStatusSubject.next({
              isSyncing: true,
              pendingCount: pending.length,
              successCount,
              failedCount
            });
          } else {
            failedCount++;
            console.error('[OfflineSync] Failed to sync (no result):', submission.questionId);
          }

        } catch (error: any) {
          failedCount++;
          console.error('[OfflineSync] Error syncing submission:', submission.questionId, error);

          // Check if it's a permanent error (e.g., 400 Bad Request, duplicate)
          if (this.isPermanentError(error)) {
            console.log('[OfflineSync] Permanent error, removing from queue:', submission.questionId);
            await this.offlineStorage.deletePendingSubmission(submission.questionId);
          }
          // Otherwise keep it for next sync attempt
        }

        // Small delay between submissions to avoid overwhelming server
        await this.delay(500);
      }

      // Final status update
      this.syncStatusSubject.next({
        isSyncing: false,
        pendingCount: failedCount, // Remaining pending
        successCount,
        failedCount
      });

      // Show result notification
      if (successCount > 0) {
        this.toastService.success(`Đã đồng bộ thành công ${successCount} bài làm!`);
      }

      if (failedCount > 0) {
        this.toastService.warning(`${failedCount} bài làm chưa thể đồng bộ. Sẽ thử lại sau.`);
      }

      console.log('[OfflineSync] Sync completed:', { successCount, failedCount });

    } catch (error) {
      console.error('[OfflineSync] Sync process error:', error);
      this.toastService.error('Lỗi khi đồng bộ dữ liệu. Vui lòng thử lại.');

      this.syncStatusSubject.next({
        isSyncing: false,
        pendingCount: 0,
        successCount: 0,
        failedCount: 0
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Check if error is permanent (should not retry)
   */
  private isPermanentError(error: any): boolean {
    // 400 Bad Request - invalid data
    // 404 Not Found - resource doesn't exist
    // 409 Conflict - duplicate submission
    // 422 Unprocessable Entity - validation error
    const permanentStatusCodes = [400, 404, 409, 422];

    if (error.status && permanentStatusCodes.includes(error.status)) {
      return true;
    }

    // Check for duplicate error message
    if (error.message && error.message.includes('duplicate')) {
      return true;
    }

    if (error.error && typeof error.error === 'string') {
      const errorMsg = error.error.toLowerCase();
      if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Manually trigger sync
   */
  async manualSync(): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.warning('Không có kết nối mạng. Vui lòng kiểm tra và thử lại.');
      return;
    }

    this.toastService.info('Đang đồng bộ dữ liệu...');
    await this.syncPendingSubmissions();
  }

  /**
   * Get pending submission count
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.offlineStorage.getPendingSubmissions();
    return pending.length;
  }

  /**
   * Check if there are pending submissions
   */
  async hasPendingSubmissions(): Promise<boolean> {
    const count = await this.getPendingCount();
    return count > 0;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current sync status
   */
  getCurrentStatus(): SyncStatus {
    return this.syncStatusSubject.value;
  }

  /**
   * Check if currently syncing
   */
  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }
}
