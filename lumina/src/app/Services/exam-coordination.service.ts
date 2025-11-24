import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ExamSession {
  examId: number;
  attemptId: number;
  partId?: number;
  startTime: number;
  tabId: string;
}

export interface ExamMessage {
  type: 'EXAM_STARTED' | 'EXAM_ENDED' | 'HEARTBEAT' | 'REQUEST_STATUS';
  session: ExamSession;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExamCoordinationService {
  private channel: BroadcastChannel | null = null;
  private currentSession: ExamSession | null = null;
  private tabId: string;
  private heartbeatInterval: any;

  private conflictDetectedSubject = new BehaviorSubject<boolean>(false);
  public conflictDetected$: Observable<boolean> = this.conflictDetectedSubject.asObservable();

  private conflictingSessionSubject = new BehaviorSubject<ExamSession | null>(null);
  public conflictingSession$: Observable<ExamSession | null> = this.conflictingSessionSubject.asObservable();

  constructor() {
    this.tabId = this.generateTabId();
    this.initBroadcastChannel();
  }

  /**
   * Initialize BroadcastChannel for cross-tab communication
   */
  private initBroadcastChannel(): void {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[ExamCoordination] BroadcastChannel not supported in this browser');
      return;
    }

    try {
      this.channel = new BroadcastChannel('lumina_exam_coordination');

      this.channel.onmessage = (event: MessageEvent<ExamMessage>) => {
        this.handleMessage(event.data);
      };

      this.channel.onmessageerror = (error) => {
        console.error('[ExamCoordination] Message error:', error);
      };

      console.log('[ExamCoordination] BroadcastChannel initialized');
    } catch (error) {
      console.error('[ExamCoordination] Failed to initialize BroadcastChannel:', error);
    }
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start tracking an exam session
   */
  startExamSession(examId: number, attemptId: number, partId?: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.channel) {
        console.warn('[ExamCoordination] BroadcastChannel not available, allowing exam');
        resolve(true);
        return;
      }

      this.currentSession = {
        examId,
        attemptId,
        partId,
        startTime: Date.now(),
        tabId: this.tabId
      };

      // First, request status from other tabs
      this.broadcastMessage({
        type: 'REQUEST_STATUS',
        session: this.currentSession,
        timestamp: Date.now()
      });

      // Wait for responses
      setTimeout(() => {
        // If no conflict detected, proceed
        if (!this.conflictDetectedSubject.value) {
          // Broadcast that we're starting
          this.broadcastMessage({
            type: 'EXAM_STARTED',
            session: this.currentSession!,
            timestamp: Date.now()
          });

          // Start heartbeat
          this.startHeartbeat();

          console.log('[ExamCoordination] Exam session started:', this.currentSession);
          resolve(true);
        } else {
          console.log('[ExamCoordination] Exam session blocked due to conflict');
          resolve(false);
        }
      }, 200); // Wait 200ms for responses
    });
  }

  /**
   * End exam session
   */
  endExamSession(): void {
    if (!this.channel || !this.currentSession) {
      return;
    }

    // Broadcast that we're ending
    this.broadcastMessage({
      type: 'EXAM_ENDED',
      session: this.currentSession,
      timestamp: Date.now()
    });

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear session
    this.currentSession = null;
    this.conflictDetectedSubject.next(false);
    this.conflictingSessionSubject.next(null);

    console.log('[ExamCoordination] Exam session ended');
  }

  /**
   * Handle incoming messages from other tabs
   */
  private handleMessage(message: ExamMessage): void {
    // Ignore messages from same tab
    if (message.session.tabId === this.tabId) {
      return;
    }

    console.log('[ExamCoordination] Received message:', message.type, message.session);

    switch (message.type) {
      case 'REQUEST_STATUS':
        // Another tab is asking if we're running an exam
        if (this.currentSession) {
          // Send back our status
          this.broadcastMessage({
            type: 'EXAM_STARTED',
            session: this.currentSession,
            timestamp: Date.now()
          });
        }
        break;

      case 'EXAM_STARTED':
        this.handleExamStarted(message.session);
        break;

      case 'EXAM_ENDED':
        this.handleExamEnded(message.session);
        break;

      case 'HEARTBEAT':
        // Update last seen timestamp
        // Could track active sessions here
        break;
    }
  }

  /**
   * Handle EXAM_STARTED message from another tab
   */
  private handleExamStarted(session: ExamSession): void {
    // Check if it's the same exam or attempt
    if (this.currentSession) {
      // Check for conflicts
      const isSameExam = session.examId === this.currentSession.examId;
      const isSameAttempt = session.attemptId === this.currentSession.attemptId;
      const isDifferentTab = session.tabId !== this.currentSession.tabId;

      if (isSameAttempt && isDifferentTab) {
        // CONFLICT: Same attempt in different tab
        console.warn('[ExamCoordination] Conflict detected - same attempt in another tab:', session);

        // Determine which tab should continue (older session wins)
        if (session.startTime < this.currentSession.startTime) {
          // Other tab started first, we should yield
          this.conflictDetectedSubject.next(true);
          this.conflictingSessionSubject.next(session);
        } else {
          // We started first, we continue
          // Other tab will detect conflict
        }
      } else if (isSameExam && !isSameAttempt && isDifferentTab) {
        // Same exam but different attempt - could be intentional (retake)
        // Just log it
        console.log('[ExamCoordination] Another tab is taking the same exam (different attempt)');
      }
    } else {
      // We don't have an active session, just store the info
      // This happens during REQUEST_STATUS response
      if (session.examId) {
        console.log('[ExamCoordination] Another tab has active exam session:', session);
      }
    }
  }

  /**
   * Handle EXAM_ENDED message from another tab
   */
  private handleExamEnded(session: ExamSession): void {
    // If this was our conflicting session, clear the conflict
    const conflicting = this.conflictingSessionSubject.value;
    if (conflicting && conflicting.tabId === session.tabId) {
      console.log('[ExamCoordination] Conflicting session ended, clearing conflict');
      this.conflictDetectedSubject.next(false);
      this.conflictingSessionSubject.next(null);
    }
  }

  /**
   * Broadcast message to other tabs
   */
  private broadcastMessage(message: ExamMessage): void {
    if (!this.channel) {
      return;
    }

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('[ExamCoordination] Failed to broadcast message:', error);
    }
  }

  /**
   * Start heartbeat to let other tabs know we're alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.currentSession) {
        this.broadcastMessage({
          type: 'HEARTBEAT',
          session: this.currentSession,
          timestamp: Date.now()
        });
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if there's a conflict
   */
  hasConflict(): boolean {
    return this.conflictDetectedSubject.value;
  }

  /**
   * Get current session
   */
  getCurrentSession(): ExamSession | null {
    return this.currentSession;
  }

  /**
   * Get conflicting session info
   */
  getConflictingSession(): ExamSession | null {
    return this.conflictingSessionSubject.value;
  }

  /**
   * Force take over (use with caution)
   */
  forceTakeOver(): void {
    if (this.currentSession) {
      console.log('[ExamCoordination] Force taking over exam session');
      this.conflictDetectedSubject.next(false);
      this.conflictingSessionSubject.next(null);

      // Broadcast that we're starting (again)
      this.broadcastMessage({
        type: 'EXAM_STARTED',
        session: this.currentSession,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.endExamSession();

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
