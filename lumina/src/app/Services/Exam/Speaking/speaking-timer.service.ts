import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

export enum TimerPhase {
  IDLE = 'idle',
  INFORMATION = 'information',
  PREPARATION = 'preparation',
  RECORDING = 'recording',
  COMPLETED = 'completed',
}

@Injectable({
  providedIn: 'root',
})
export class SpeakingTimerService implements OnDestroy {
  private phaseSubject = new BehaviorSubject<TimerPhase>(TimerPhase.IDLE);
  private prepTimeSubject = new BehaviorSubject<number>(0);
  private recordTimeSubject = new BehaviorSubject<number>(0);
  private infoTimeSubject = new BehaviorSubject<number>(0);

  private prepEndSubject = new Subject<void>();
  private recordEndSubject = new Subject<void>();
  private infoEndSubject = new Subject<void>();

  phase$ = this.phaseSubject.asObservable();
  prepTimeRemaining$ = this.prepTimeSubject.asObservable();
  recordTimeRemaining$ = this.recordTimeSubject.asObservable();
  infoTimeRemaining$ = this.infoTimeSubject.asObservable();
  onPreparationEnd$ = this.prepEndSubject.asObservable();
  onRecordingEnd$ = this.recordEndSubject.asObservable();
  onInformationEnd$ = this.infoEndSubject.asObservable();

  private timerId: any = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isPaused: boolean = false;

  private visibilityChangeHandler: (() => void) | null = null;

  constructor() {
    this.setupVisibilityHandler();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  startInformationReading(seconds: number): void {
    this.reset();
    this.phaseSubject.next(TimerPhase.INFORMATION);
    this.startCountdown(seconds, this.infoTimeSubject, this.infoEndSubject);
  }

  startPreparation(seconds: number): void {
    this.clearTimer();
    this.phaseSubject.next(TimerPhase.PREPARATION);
    this.startCountdown(seconds, this.prepTimeSubject, this.prepEndSubject);
  }

  startRecording(seconds: number): void {
    this.clearTimer();
    this.phaseSubject.next(TimerPhase.RECORDING);
    this.startCountdown(seconds, this.recordTimeSubject, this.recordEndSubject);
  }

  reset(): void {
    this.clearTimer();
    this.phaseSubject.next(TimerPhase.IDLE);
    this.prepTimeSubject.next(0);
    this.recordTimeSubject.next(0);
    this.infoTimeSubject.next(0);
    this.isPaused = false;
    this.pausedTime = 0;
  }

  private startCountdown(
    duration: number,
    subject: BehaviorSubject<number>,
    endEvent: Subject<void>
  ): void {
    this.startTime = Date.now();
    this.pausedTime = 0;
    this.isPaused = false;
    subject.next(duration);

    this.timerId = setInterval(() => {
      if (this.isPaused) {
        return;
      }

      const elapsed = Math.floor(
        (Date.now() - this.startTime - this.pausedTime) / 1000
      );
      const remaining = Math.max(0, duration - elapsed);

      subject.next(remaining);

      if (remaining === 0) {
        this.clearTimer();
        this.phaseSubject.next(TimerPhase.COMPLETED);
        endEvent.next();
      }
    }, 100);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private setupVisibilityHandler(): void {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
      } else {
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private cleanup(): void {
    this.clearTimer();

    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        'visibilitychange',
        this.visibilityChangeHandler
      );
      this.visibilityChangeHandler = null;
    }

    this.prepEndSubject.complete();
    this.recordEndSubject.complete();
    this.infoEndSubject.complete();
  }
}