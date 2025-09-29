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
  @Output() timeout = new EventEmitter<void>();

  remainingSeconds: number = 0;
  private intervalId: any = null;

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['time'] || changes['resetAt']) {
      this.startCountdown();
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
