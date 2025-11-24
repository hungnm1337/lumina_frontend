import { Injectable } from '@angular/core';

export interface PendingSpeakingSubmission {
  questionId: number;
  attemptId: number;
  audioBlob: Blob;
  recordingTime: number;
  timestamp: number;
  mimeType: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private dbName = 'lumina_offline_db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Store for pending speaking submissions
        if (!db.objectStoreNames.contains('pending_submissions')) {
          const store = db.createObjectStore('pending_submissions', { keyPath: 'questionId' });
          store.createIndex('attemptId', 'attemptId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for audio blob drafts (for page refresh recovery)
        if (!db.objectStoreNames.contains('audio_drafts')) {
          const store = db.createObjectStore('audio_drafts', { keyPath: 'questionId' });
          store.createIndex('attemptId', 'attemptId', { unique: false });
        }

        console.log('[OfflineStorage] IndexedDB schema upgraded');
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Save a pending submission when offline
   */
  async savePendingSubmission(submission: PendingSpeakingSubmission): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['pending_submissions'], 'readwrite');
      const store = transaction.objectStore('pending_submissions');

      await new Promise<void>((resolve, reject) => {
        const request = store.put(submission);

        request.onsuccess = () => {
          console.log('[OfflineStorage] Saved pending submission:', submission.questionId);
          resolve();
        };

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to save pending submission:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[OfflineStorage] Error saving pending submission:', error);
      throw error;
    }
  }

  /**
   * Get all pending submissions
   */
  async getPendingSubmissions(): Promise<PendingSpeakingSubmission[]> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['pending_submissions'], 'readonly');
      const store = transaction.objectStore('pending_submissions');

      return new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to get pending submissions:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[OfflineStorage] Error getting pending submissions:', error);
      return [];
    }
  }

  /**
   * Delete a pending submission after successful sync
   */
  async deletePendingSubmission(questionId: number): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['pending_submissions'], 'readwrite');
      const store = transaction.objectStore('pending_submissions');

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(questionId);

        request.onsuccess = () => {
          console.log('[OfflineStorage] Deleted pending submission:', questionId);
          resolve();
        };

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to delete pending submission:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[OfflineStorage] Error deleting pending submission:', error);
    }
  }

  /**
   * Save audio draft for recovery after page refresh
   */
  async saveAudioDraft(
    questionId: number,
    attemptId: number,
    audioBlob: Blob,
    recordingTime: number
  ): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['audio_drafts'], 'readwrite');
      const store = transaction.objectStore('audio_drafts');

      const draft = {
        questionId,
        attemptId,
        audioBlob,
        recordingTime,
        timestamp: Date.now()
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(draft);

        request.onsuccess = () => {
          console.log('[OfflineStorage] Saved audio draft:', questionId);
          resolve();
        };

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to save audio draft:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[OfflineStorage] Error saving audio draft:', error);
    }
  }

  /**
   * Get audio draft for a specific question
   */
  async getAudioDraft(questionId: number): Promise<{
    audioBlob: Blob;
    recordingTime: number;
  } | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['audio_drafts'], 'readonly');
      const store = transaction.objectStore('audio_drafts');

      return new Promise((resolve, reject) => {
        const request = store.get(questionId);

        request.onsuccess = () => {
          if (request.result) {
            resolve({
              audioBlob: request.result.audioBlob,
              recordingTime: request.result.recordingTime
            });
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to get audio draft:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[OfflineStorage] Error getting audio draft:', error);
      return null;
    }
  }

  /**
   * Delete audio draft after successful submission
   */
  async deleteAudioDraft(questionId: number): Promise<void> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['audio_drafts'], 'readwrite');
      const store = transaction.objectStore('audio_drafts');

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(questionId);

        request.onsuccess = () => {
          console.log('[OfflineStorage] Deleted audio draft:', questionId);
          resolve();
        };

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to delete audio draft:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[OfflineStorage] Error deleting audio draft:', error);
    }
  }

  /**
   * Get all audio drafts for an attempt
   */
  async getAllAudioDrafts(attemptId: number): Promise<Array<{
    questionId: number;
    audioBlob: Blob;
    recordingTime: number;
  }>> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction(['audio_drafts'], 'readonly');
      const store = transaction.objectStore('audio_drafts');
      const index = store.index('attemptId');

      return new Promise((resolve, reject) => {
        const request = index.getAll(attemptId);

        request.onsuccess = () => {
          const results = (request.result || []).map((item: any) => ({
            questionId: item.questionId,
            audioBlob: item.audioBlob,
            recordingTime: item.recordingTime
          }));
          resolve(results);
        };

        request.onerror = () => {
          console.error('[OfflineStorage] Failed to get all audio drafts:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[OfflineStorage] Error getting all audio drafts:', error);
      return [];
    }
  }

  /**
   * Clear all data for an attempt (when exam finished)
   */
  async clearAttemptData(attemptId: number): Promise<void> {
    try {
      const db = await this.ensureDB();

      // Clear pending submissions
      const tx1 = db.transaction(['pending_submissions'], 'readwrite');
      const store1 = tx1.objectStore('pending_submissions');
      const index1 = store1.index('attemptId');
      const request1 = index1.openCursor(IDBKeyRange.only(attemptId));

      request1.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Clear audio drafts
      const tx2 = db.transaction(['audio_drafts'], 'readwrite');
      const store2 = tx2.objectStore('audio_drafts');
      const index2 = store2.index('attemptId');
      const request2 = index2.openCursor(IDBKeyRange.only(attemptId));

      request2.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      await Promise.all([
        new Promise(resolve => tx1.oncomplete = resolve),
        new Promise(resolve => tx2.oncomplete = resolve)
      ]);

      console.log('[OfflineStorage] Cleared all data for attempt:', attemptId);
    } catch (error) {
      console.error('[OfflineStorage] Error clearing attempt data:', error);
    }
  }

  /**
   * Get database size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { usage: 0, quota: 0 };
  }
}
