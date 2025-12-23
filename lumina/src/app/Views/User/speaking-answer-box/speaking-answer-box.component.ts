import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SpeakingService,
  SpeakingScoringResult,
} from '../../../Services/Exam/Speaking/speaking.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { SpeakingQuestionStateService } from '../../../Services/Exam/Speaking/speaking-question-state.service';
import {
  SpeakingTimerService,
  TimerPhase,
} from '../../../Services/Exam/Speaking/speaking-timer.service';
type RecordingState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'submitted'
  | 'error';

@Component({
  selector: 'app-speaking-answer-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speaking-answer-box.component.html',
  styleUrls: ['./speaking-answer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeakingAnswerBoxComponent
  implements OnInit, OnChanges, OnDestroy {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() questionTime: number = 0;
  @Input() attemptId: number = 0;
  @Input() isLastQuestion: boolean = false;

  @Input() preparationTime: number = 0;
  @Input() recordingTime: number = 0;
  @Input() showInfoPhase: boolean = false;
  @Input() infoReadTime: number = 0;

  @Output() answered = new EventEmitter<boolean>();
  @Output() scoringResult = new EventEmitter<{
    questionId: number;
    result: SpeakingScoringResult;
  }>();
  @Output() submitting = new EventEmitter<boolean>();
  @Output() recordingStatusChange = new EventEmitter<boolean>();
  @Output() autoAdvanceNext = new EventEmitter<void>();

  state: RecordingState = 'idle';
  recordingElapsed: number = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any = null;
  private audioBlob: Blob | null = null;

  private isActivelyProcessing: boolean = false;

  private currentDisplayedQuestionId: number = 0;

  result: SpeakingScoringResult | null = null;
  errorMessage: string = '';
  cancelledByTabSwitch: boolean = false; // New flag for tab switch cancellation

  private audioUrl: string | null = null;

  private onStopPromiseResolve: (() => void) | null = null;

  private recordingStartTime: number = 0;
  private pausedTime: number = 0;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor(
    private speakingService: SpeakingService,
    private toastService: ToastService,
    private speakingStateService: SpeakingQuestionStateService,
    private cdr: ChangeDetectorRef,
    public timerService: SpeakingTimerService
  ) {
    this.state = 'idle';

    this.setupVisibilityHandler();
  }

  ngOnInit(): void {
    this.currentDisplayedQuestionId = this.questionId;

    if (this.questionId) {
      this.speakingStateService.initializeQuestion(this.questionId);
      this.restoreStateFromService();

      const state = this.speakingStateService.getQuestionState(this.questionId);
      if (!state || state.state === 'not_started') {
        if (this.showInfoPhase && this.infoReadTime > 0) {
          this.timerService.startInformationReading(this.infoReadTime);
        } else if (this.preparationTime > 0) {
          this.timerService.startPreparation(this.preparationTime);
        }
      }

      this.subscribeToTimerEvents();

      this.cdr.markForCheck();
    }
  }

  private subscribeToTimerEvents(): void {
    this.timerService.onInformationEnd$.subscribe(() => {
      if (this.preparationTime > 0) {
        this.timerService.startPreparation(this.preparationTime);
      }
    });

    this.timerService.onPreparationEnd$.subscribe(() => {
      this.startRecordingAutomatic();
    });

    this.timerService.onRecordingEnd$.subscribe(async () => {
      await this.handleRecordingEnd();
    });
  }

  private async startRecordingAutomatic(): Promise<void> {
    try {
      await this.initializeMediaRecorder();

      if (this.recordingTime > 0) {
        this.timerService.startRecording(this.recordingTime);
      }
    } catch (error) {
      this.errorMessage = 'Không thể bắt đầu ghi âm. Vui lòng thử lại.';
      this.state = 'error';
      this.toastService.error(this.errorMessage);
    }
  }

  private async initializeMediaRecorder(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (this.state === 'recording') {
          this.stopRecording();
          this.state = 'error';
          this.errorMessage = 'Microphone bị ngắt kết nối';
          this.toastService.error('Microphone bị ngắt kết nối!');
          this.cdr.markForCheck();
        }
      };
    });

    const mimeType = this.getSupportedMimeType();
    console.log(`[RecordingBox] 🎤 Initializing MediaRecorder - MimeType: ${mimeType}, QuestionId: ${this.questionId}`);
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        console.log(`[RecordingBox] 📊 Audio chunk received: ${(event.data.size / 1024).toFixed(2)}KB (Total chunks: ${this.audioChunks.length})`);
      }
    };

    this.mediaRecorder.onerror = (event: any) => {
      console.error('[RecordingBox] ❌ MediaRecorder error:', event);
      this.state = 'error';
      this.errorMessage = 'Lỗi khi ghi âm';
      this.clearTimer();
      this.recordingStatusChange.emit(false);
    };

    this.mediaRecorder.onstop = async () => {
      this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
      console.log(`[RecordingBox] 🔴 Recording stopped - Blob created: ${(this.audioBlob.size / 1024).toFixed(2)}KB from ${this.audioChunks.length} chunks`);

      stream.getTracks().forEach((track) => track.stop());

      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      if (this.audioBlob && this.audioBlob.size > 0) {
        console.log(`[RecordingBox] ✅ Valid audio blob - saving to state service`);
        const currentState = this.speakingStateService.getQuestionState(
          this.questionId
        );
        const protectedStates: Array<'submitted' | 'scoring' | 'scored'> = [
          'submitted',
          'scoring',
          'scored',
        ];

        if (
          currentState &&
          protectedStates.includes(currentState.state as any)
        ) {
          console.log(`[RecordingBox] ⚠️ Skipping save - question in protected state: ${currentState.state}`);
        } else {
          this.speakingStateService.saveRecording(
            this.questionId,
            this.audioBlob,
            this.recordingElapsed
          );
        }
        this.cdr.markForCheck();
      } else {
        console.warn(`[RecordingBox] ⚠️ Empty audio blob - size: ${this.audioBlob?.size || 0} bytes`);
      }

      this.recordingStatusChange.emit(false);

      if (this.onStopPromiseResolve) {
        this.onStopPromiseResolve();
        this.onStopPromiseResolve = null;
      }
    };

    this.mediaRecorder.start();
    console.log(`[RecordingBox] ▶️ Recording started - QuestionId: ${this.questionId}`);
    this.state = 'recording';
    this.recordingElapsed = 0;

    this.toastService.info('Đang ghi âm...');
    this.recordingStatusChange.emit(true);

    const currentState = this.speakingStateService.getQuestionState(
      this.questionId
    );
    if (
      currentState &&
      !['scored', 'scoring', 'submitted'].includes(currentState.state)
    ) {
      this.speakingStateService.updateQuestionState(this.questionId, {
        state: 'in_progress',
      });
    }
  }

  private async handleRecordingEnd(): Promise<void> {
    if (this.mediaRecorder && this.state === 'recording') {
      const onStopPromise = new Promise<void>((resolve) => {
        this.onStopPromiseResolve = resolve;

        setTimeout(() => {
          if (this.onStopPromiseResolve) {
            this.onStopPromiseResolve = null;
            resolve();
          }
        }, 3000);
      });

      this.mediaRecorder.stop();
      this.clearTimer();

      await onStopPromise;

      if (!this.audioBlob || this.audioBlob.size === 0) {
        const savedState = this.speakingStateService.getQuestionState(
          this.questionId
        );
        if (savedState?.audioBlob && savedState.audioBlob.size > 0) {
          this.audioBlob = savedState.audioBlob;
        }
      }

      if (this.audioBlob && this.audioBlob.size > 0) {
        if (this.isLastQuestion) {
          this.submitRecording().catch((error) => { });
        } else {
          this.submitRecording().catch((error) => { });

          this.autoAdvanceNext.emit();
        }
      } else {
        this.toastService.error('Không có bản ghi âm. Vui lòng thử lại.');
        this.state = 'error';
        this.errorMessage = 'Không có bản ghi âm để nộp';
        this.cdr.markForCheck();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.state === 'recording' || this.state === 'processing') {
      return;
    }

    const hasQuestionIdChange =
      changes['questionId'] &&
      !changes['questionId'].isFirstChange() &&
      changes['questionId'].currentValue !==
      changes['questionId'].previousValue;

    const hasResetChange =
      changes['resetAt'] &&
      !changes['resetAt'].isFirstChange() &&
      changes['resetAt'].currentValue !== changes['resetAt'].previousValue;

    if (!hasQuestionIdChange && !hasResetChange) {
      return;
    }

    if (this.currentDisplayedQuestionId !== this.questionId) {
      this.currentDisplayedQuestionId = this.questionId;

      if (this.audioBlob) {
        this.audioBlob = null;
      }
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      this.resetComponent();

      this.speakingStateService.initializeQuestion(this.questionId);
      this.restoreStateFromService();

      this.cdr.markForCheck();
    } else if (hasResetChange) {
      if ((this.state as string) === 'recording') {
        this.stopRecording();
        setTimeout(() => {
          this.restoreStateFromService();
          this.cdr.markForCheck();
        }, 100);
      } else {
        this.restoreStateFromService();
        this.cdr.markForCheck();
      }
    }
  }

  private restoreStateFromService(): void {
    if (this.state === 'recording' || this.state === 'processing') {
      return;
    }

    const savedState = this.speakingStateService.getQuestionState(
      this.questionId
    );

    if (savedState) {
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      this.recordingElapsed = savedState.recordingTime;
      this.result = savedState.result;
      this.errorMessage = savedState.errorMessage;

      if (savedState.result) {
        this.state = 'submitted';
        this.isActivelyProcessing = false;
        this.audioBlob = null;
      } else if (
        savedState.state === 'submitted' ||
        savedState.state === 'scored'
      ) {
        this.state = 'submitted';
        this.isActivelyProcessing = false;
        this.audioBlob = null;
      } else if (savedState.state === 'has_recording') {
        if (savedState.audioBlob && savedState.audioBlob.size > 0) {
          this.state = 'idle';
          this.isActivelyProcessing = false;
          this.audioBlob = savedState.audioBlob;
        } else {
          this.state = 'idle';
          this.isActivelyProcessing = false;
          this.audioBlob = null;
          this.speakingStateService.clearRecording(this.questionId);
        }
      } else if (savedState.state === 'scoring') {
        this.state = 'submitted';
        this.isActivelyProcessing = false;
        this.audioBlob = null;
      } else if (savedState.state === 'in_progress') {
        if (savedState.audioBlob && savedState.audioBlob.size > 0) {
          this.state = 'idle';
          this.isActivelyProcessing = false;
          this.audioBlob = savedState.audioBlob;
        } else {
          this.state = 'idle';
          this.isActivelyProcessing = false;
          this.audioBlob = null;
          this.speakingStateService.clearRecording(this.questionId);
        }
      } else {
        this.state = 'idle';
        this.isActivelyProcessing = false;
        this.audioBlob = null;
      }
    } else {
      this.resetComponent();
    }

    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    // Stop all timers first
    this.timerService.reset();
    this.clearTimer();

    // Stop recording immediately
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
        // Stop all media tracks
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream
            .getTracks()
            .forEach((track) => track.stop());
        }
      } catch (error) {
        console.error('Error stopping media recorder:', error);
      }
    }

    this.mediaRecorder = null;
    this.state = 'idle';

    // Cancel any pending operations
    if (this.onStopPromiseResolve) {
      this.onStopPromiseResolve();
      this.onStopPromiseResolve = null;
    }

    // Clear toast messages
    this.toastService.clear();

    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        'visibilitychange',
        this.visibilityChangeHandler
      );
      this.visibilityChangeHandler = null;
    }
  }

  async startRecording(): Promise<void> {
    if (this.currentDisplayedQuestionId !== this.questionId) {
      this.currentDisplayedQuestionId = this.questionId;

      if (this.audioBlob) {
        this.audioBlob = null;
      }
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      this.resetComponent();
      this.speakingStateService.initializeQuestion(this.questionId);
      this.restoreStateFromService();

      this.cdr.detectChanges();

      if (this.state !== 'idle') {
        this.toastService.error(
          'Lỗi: Trạng thái không hợp lệ. Vui lòng thử lại.'
        );
        return;
      }
    }

    if (this.disabled) {
      this.toastService.warning('Không thể ghi âm lúc này');
      return;
    }

    if (this.state !== 'idle') {
      this.toastService.warning(
        `Không thể ghi âm - trạng thái hiện tại: ${this.state}`
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (this.state === 'recording') {
            this.stopRecording();

            this.state = 'error';
            this.errorMessage =
              'Microphone bị ngắt kết nối. Bản ghi âm đã được lưu. Vui lòng ghi lại nếu cần.';
            this.toastService.error('Microphone bị ngắt kết nối!');

            this.cdr.markForCheck();
          }
        };
      });

      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event: any) => {
        this.state = 'error';
        this.errorMessage = 'Lỗi khi ghi âm. Vui lòng thử lại.';
        this.clearTimer();
        this.recordingStatusChange.emit(false);
      };

      this.mediaRecorder.onstop = async () => {
        this.audioBlob = new Blob(this.audioChunks, { type: mimeType });

        stream.getTracks().forEach((track) => track.stop());

        if (this.audioUrl) {
          URL.revokeObjectURL(this.audioUrl);
          this.audioUrl = null;
        }

        this.recordingStatusChange.emit(false);

        if (this.audioBlob && this.audioBlob.size > 0) {
          const currentState = this.speakingStateService.getQuestionState(
            this.questionId
          );
          const protectedStates: Array<'submitted' | 'scoring' | 'scored'> = [
            'submitted',
            'scoring',
            'scored',
          ];

          if (
            currentState &&
            protectedStates.includes(currentState.state as any)
          ) {
          } else {
            this.speakingStateService.saveRecording(
              this.questionId,
              this.audioBlob,
              this.recordingTime
            );
          }
          this.cdr.markForCheck();
        } else {
        }

        if (this.onStopPromiseResolve) {
          this.onStopPromiseResolve();
          this.onStopPromiseResolve = null;
        }
      };

      this.mediaRecorder.start();
      this.state = 'recording';
      this.startTimer();
      this.toastService.info('Đang ghi âm...');

      this.recordingStatusChange.emit(true);

      const currentState = this.speakingStateService.getQuestionState(
        this.questionId
      );
      if (
        currentState &&
        !['scored', 'scoring', 'submitted'].includes(currentState.state)
      ) {
        this.speakingStateService.updateQuestionState(this.questionId, {
          state: 'in_progress',
        });
      }
    } catch (error) {
      this.errorMessage =
        'Không thể truy cập microphone. Vui lòng cho phép quyền truy cập.';
      this.state = 'error';
      this.toastService.error('Không thể truy cập microphone');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
      this.clearTimer();
      this.state = 'idle';
      this.toastService.success(
        'Đã dừng ghi âm - Bản ghi đã được lưu như bản nháp'
      );

      this.recordingStatusChange.emit(false);
    }
  }

  async submitRecording(): Promise<void> {
    console.log(`[RecordingBox] 📤 submitRecording called - State: ${this.state}, QuestionId: ${this.questionId}, AttemptId: ${this.attemptId}`);

    if (this.state === 'processing' || this.state === 'submitted') {
      console.warn(`[RecordingBox] ⚠️ Skipping submission - already in ${this.state} state`);
      return;
    }

    const submittedQuestionId = this.questionId;

    if (!this.audioBlob || this.audioBlob.size === 0) {
      console.warn(`[RecordingBox] ⚠️ No audio blob - checking state service`);
      const savedState =
        this.speakingStateService.getQuestionState(submittedQuestionId);
      if (savedState?.audioBlob && savedState.audioBlob.size > 0) {
        console.log(`[RecordingBox] ✅ Found saved audio blob: ${(savedState.audioBlob.size / 1024).toFixed(2)}KB`);
        this.audioBlob = savedState.audioBlob;
      } else {
        console.error('[RecordingBox] ❌ No audio blob available for submission');
        this.toastService.error(
          'Không có bản ghi âm để nộp. Vui lòng ghi âm lại.'
        );
        this.state = 'error';
        this.errorMessage = 'Không có bản ghi âm để nộp';
        this.cdr.markForCheck();
        return;
      }
    }

    console.log(`[RecordingBox] 📊 Audio to submit - Size: ${(this.audioBlob.size / 1024).toFixed(2)}KB, Type: ${this.audioBlob.type}`);

    if (this.disabled) {
      console.warn('[RecordingBox] ⚠️ Component is disabled - cannot submit');
      return;
    }

    if (!this.attemptId || this.attemptId <= 0) {
      console.error(`[RecordingBox] ❌ Invalid attemptId: ${this.attemptId}`);
      this.toastService.error(
        'Lỗi: Không tìm thấy ID bài thi. Vui lòng refresh trang và thử lại.'
      );
      this.state = 'error';
      return;
    }

    if (!navigator.onLine) {
      console.error('[RecordingBox] ❌ No network connection');
      this.toastService.error(
        'Không có kết nối mạng. Vui lòng kiểm tra và thử lại.'
      );
      return;
    }

    const submissionKey = `speaking_submitting_${submittedQuestionId}_${this.attemptId}`;
    const isSubmitting = sessionStorage.getItem(submissionKey);

    if (isSubmitting) {
      console.warn(`[RecordingBox] ⚠️ Already submitting - key: ${submissionKey}`);
      this.toastService.warning('Bài này đang được nộp. Vui lòng đợi...');
      return;
    }

    sessionStorage.setItem(submissionKey, 'true');
    console.log(`[RecordingBox] 🚀 Starting submission process...`);

    this.state = 'processing';
    this.isActivelyProcessing = true;
    this.errorMessage = '';
    this.submitting.emit(true);
    this.speakingStateService.markAsScoring(submittedQuestionId);

    try {
      const result = await this.speakingStateService.submitAnswerAndStore(
        submittedQuestionId,
        this.audioBlob,
        this.attemptId
      );

      if (result) {
        console.log(`[RecordingBox] ✅ Submission successful - Score: ${result.overallScore}`);
        this.result = result;
        this.state = 'submitted';
        this.isActivelyProcessing = false;

        this.scoringResult.emit({ questionId: submittedQuestionId, result });
        this.answered.emit(true);

        this.cdr.markForCheck();
      }
    } catch (error: any) {
      console.error('[RecordingBox] ❌ Submission error:', error);
      this.isActivelyProcessing = false;

      this.errorMessage =
        error?.error?.message ||
        'Đã xảy ra lỗi khi chấm điểm. Vui lòng thử lại.';
      this.state = 'error';
      this.toastService.error(this.errorMessage);

      this.cdr.markForCheck();
    } finally {
      sessionStorage.removeItem(submissionKey);
      this.submitting.emit(false);
    }
  }

  private resetComponent(): void {
    this.state = 'idle';
    this.recordingElapsed = 0;
    this.audioBlob = null;
    this.audioChunks = [];
    this.result = null;
    this.errorMessage = '';
    this.cancelledByTabSwitch = false; // Reset flag
    this.isActivelyProcessing = false;
    this.onStopPromiseResolve = null;
    this.clearTimer();
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.cdr.markForCheck();
  }

  private startTimer(): void {
    this.clearTimer();

    this.recordingStartTime = Date.now();
    this.pausedTime = 0;

    this.recordingTimer = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - this.recordingStartTime - this.pausedTime) / 1000
      );
      this.recordingElapsed = elapsed;

      this.cdr.markForCheck();

      const timeLimit = this.questionTime > 0 ? this.questionTime : 120;
      if (this.recordingElapsed >= timeLimit) {
        this.stopRecording();
        this.toastService.warning(
          'Hết thời gian ghi âm! Bản ghi đã được lưu như bản nháp.'
        );
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private setupVisibilityHandler(): void {
    this.visibilityChangeHandler = async () => {
      if (document.hidden) {
        if (this.state === 'recording') {
          console.warn(
            '[ANTI-CHEAT] User switched tab while recording - cancelling'
          );

          // Dừng ghi âm ngay lập tức
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.clearTimer();

            // Dừng timer service để ẩn UI đếm ngược ngay lập tức
            this.timerService.reset();

            // Set error state với flag đặc biệt
            this.state = 'error';
            this.cancelledByTabSwitch = true;

            // Clear audio data
            this.audioBlob = null;
            this.audioChunks = [];

            this.cdr.markForCheck();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.recordingElapsed / 60);
    const seconds = this.recordingElapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  get hasRecording(): boolean {
    return (
      this.audioBlob !== null &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get canStartRecording(): boolean {
    return (
      !this.disabled &&
      (this.state === 'idle' || this.state === 'error') &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get isRecording(): boolean {
    return (
      this.state === 'recording' &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get isProcessing(): boolean {
    const savedState = this.speakingStateService.getQuestionState(
      this.questionId
    );
    const isProcessingCurrentQuestion =
      this.state === 'processing' &&
      this.isActivelyProcessing &&
      this.currentDisplayedQuestionId === this.questionId &&
      savedState?.state === 'scoring';

    return isProcessingCurrentQuestion;
  }

  get isSubmitted(): boolean {
    return (
      this.state === 'submitted' &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }

  get isError(): boolean {
    return (
      this.state === 'error' &&
      this.currentDisplayedQuestionId === this.questionId
    );
  }
}
