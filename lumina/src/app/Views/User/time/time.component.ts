import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-time',
  standalone: true,
  imports: [],
  templateUrl: './time.component.html'
})
export class TimeComponent implements OnInit, OnChanges, OnDestroy {
  @Input() time: number = 0; // total seconds
  @Input() resetAt: number = 0; // change this to force a reset
  @Input() paused: boolean = false; // pause/resume without resetting
  @Input() savedTime: number = 0; // saved remaining time from localStorage
  @Output() timeout = new EventEmitter<void>();
  @Output() timeUpdate = new EventEmitter<number>(); // emit remaining time updates

  remainingSeconds: number = 0;
  private intervalId: any = null;

  get formattedTime(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    return `${this.padToTwoDigits(minutes)}:${this.padToTwoDigits(seconds)}`;
  }

  private padToTwoDigits(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['time'] || changes['resetAt']) {
      this.startCountdown();
      return;
    }
    if (changes['savedTime'] && this.savedTime > 0) {
      this.remainingSeconds = this.savedTime;
      if (!this.paused) {
        this.startInterval();
      }
      return;
    }
    if (changes['paused']) {
      if (this.paused) {
        this.clearTimer();
      } else {
        if (this.remainingSeconds > 0) {
          this.startInterval();
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  get progressPercent(): number {
    if (this.time <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (this.remainingSeconds / this.time) * 100));
  }

  private startCountdown(): void {
    this.clearTimer();
    this.remainingSeconds = Math.max(0, Math.floor(this.time || 0));

    if (this.remainingSeconds <= 0) {
      return;
    }
    if (!this.paused) {
      this.startInterval();
    }
  }

  private startInterval(): void {
    this.clearTimer();
    this.intervalId = setInterval(() => {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
      this.timeUpdate.emit(this.remainingSeconds); // Emit time updates
      if (this.remainingSeconds === 0) {
        this.clearTimer();
        this.timeout.emit();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
