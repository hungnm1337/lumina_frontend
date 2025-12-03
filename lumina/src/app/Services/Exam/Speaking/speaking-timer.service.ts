import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

export enum TimerPhase {
  IDLE = 'idle',
  INFORMATION = 'information', // Part 4 Q8 only
  PREPARATION = 'preparation',
  RECORDING = 'recording',
  COMPLETED = 'completed'
}

@Injectable({
  providedIn: 'root'
})
export class SpeakingTimerService implements OnDestroy {
  // State observables
  private phaseSubject = new BehaviorSubject<TimerPhase>(TimerPhase.IDLE);
  private prepTimeSubject = new BehaviorSubject<number>(0);
  private recordTimeSubject = new BehaviorSubject<number>(0);
  private infoTimeSubject = new BehaviorSubject<number>(0);

  // Event subjects
  private prepEndSubject = new Subject<void>();
  private recordEndSubject = new Subject<void>();
  private infoEndSubject = new Subject<void>();

  // Public observables
  phase$ = this.phaseSubject.asObservable();
  prepTimeRemaining$ = this.prepTimeSubject.asObservable();
  recordTimeRemaining$ = this.recordTimeSubject.asObservable();
  infoTimeRemaining$ = this.infoTimeSubject.asObservable();
  onPreparationEnd$ = this.prepEndSubject.asObservable();
  onRecordingEnd$ = this.recordEndSubject.asObservable();
  onInformationEnd$ = this.infoEndSubject.asObservable();

  // Timer state
  private timerId: any = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isPaused: boolean = false;

  // Page Visibility API handler
  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    this.setupVisibilityHandler();
    // console.log('[SpeakingTimerService] Service initialized');
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Start information reading phase (Part 4 Q8 only)
   */
  startInformationReading(seconds: number): void {
    // console.log(`[SpeakingTimerService] Starting information reading: ${seconds}s`);
    this.reset();
    this.phaseSubject.next(TimerPhase.INFORMATION);
    this.startCountdown(seconds, this.infoTimeSubject, this.infoEndSubject);
  }

  /**
   * Start preparation phase
   */
  startPreparation(seconds: number): void {
    // console.log(`[SpeakingTimerService] Starting preparation: ${seconds}s`);
    this.clearTimer();
    this.phaseSubject.next(TimerPhase.PREPARATION);
    this.startCountdown(seconds, this.prepTimeSubject, this.prepEndSubject);
  }

  /**
   * Start recording phase
   */
  startRecording(seconds: number): void {
    // console.log(`[SpeakingTimerService] Starting recording: ${seconds}s`);
    this.clearTimer();
    this.phaseSubject.next(TimerPhase.RECORDING);
    this.startCountdown(seconds, this.recordTimeSubject, this.recordEndSubject);
  }

  /**
   * Reset timer to idle state
   */
  reset(): void {
    // console.log('[SpeakingTimerService] Resetting timer');
    this.clearTimer();
    this.phaseSubject.next(TimerPhase.IDLE);
    this.prepTimeSubject.next(0);
    this.recordTimeSubject.next(0);
    this.infoTimeSubject.next(0);
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): TimerPhase {
    return this.phaseSubject.value;
  }

  /**
   * Core countdown logic
   * Uses Date.now() for accuracy instead of incrementing counter
   */
  private startCountdown(
    duration: number,
    subject: BehaviorSubject<number>,
    endEvent: Subject<void>
  ): void {
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.isPaused = false;
    subject.next(duration);

    // console.log(`[SpeakingTimerService] Countdown started: ${duration}s`);

    // Update every 100ms for smooth UI
    this.timerId = setInterval(() => {
      if (this.isPaused) {
        return; // Don't update while paused
      }

      const elapsed = Math.floor(
        (Date.now() - this.startTime - this.pausedTime) / 1000
      );
      const remaining = Math.max(0, duration - elapsed);

      subject.next(remaining);

      // Log removed - too verbose
      // if (elapsed > 0 && elapsed % 1 === 0) {
      //   console.log(`[SpeakingTimerService] ${this.phaseSubject.value} - ${remaining}s remaining`);
      // }

      if (remaining === 0) {
        // console.log(`[SpeakingTimerService] ${this.phaseSubject.value} phase completed`);
        this.clearTimer();
        this.phaseSubject.next(TimerPhase.COMPLETED);
        endEvent.next();
      }
    }, 100);
  }

  /**
   * Clear current timer interval
   */
  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      // console.log('[SpeakingTimerService] Timer cleared');
    }
  }

  /**
   * Setup Page Visibility API to pause timer when user switches tabs
   */
  private setupVisibilityHandler(): void {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        // User switched away from tab - pause timer
        if (this.timerId && !this.isPaused) {
          // console.log('[SpeakingTimerService] Page hidden - pausing timer');
          this.isPaused = true;
          this.pausedTime += Date.now() - this.startTime;
        }
      } else {
        // User returned to tab - resume timer
        if (this.timerId && this.isPaused) {
          // console.log('[SpeakingTimerService] Page visible - resuming timer');
          this.isPaused = false;
          this.startTime = Date.now();
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // console.log('[SpeakingTimerService] Cleaning up');
    this.clearTimer();

    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        'visibilitychange',
        this.visibilityChangeHandler
      );
      this.visibilityChangeHandler = null;
    }

    // Complete all subjects
    this.prepEndSubject.complete();
    this.recordEndSubject.complete();
    this.infoEndSubject.complete();
  }
}
