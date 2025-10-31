import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SpeakingService,
  SpeakingScoringResult,
} from '../../../Services/Exam/Speaking/speaking.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { SpeakingQuestionStateService } from '../../../Services/Exam/Speaking/speaking-question-state.service';
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
  styleUrl: './speaking-answer-box.component.scss',
})
export class SpeakingAnswerBoxComponent implements OnChanges, OnDestroy {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() questionTime: number = 0; // Time limit for this question
  @Input() attemptId: number = 0; // ✅ THÊM: Attempt ID của lượt thi hiện tại
  @Output() answered = new EventEmitter<boolean>();
  @Output() scoringResult = new EventEmitter<SpeakingScoringResult>();
  @Output() submitting = new EventEmitter<boolean>(); // New: Notify parent về trạng thái submit

  state: RecordingState = 'idle';
  recordingTime: number = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any = null;
  private audioBlob: Blob | null = null;

  // Kết quả chấm điểm
  result: SpeakingScoringResult | null = null;
  errorMessage: string = '';

  // Cache for audio URL to prevent ExpressionChangedAfterItHasBeenCheckedError
  private audioUrl: string | null = null;

  constructor(
    private speakingService: SpeakingService,
    private toastService: ToastService,
    private speakingStateService: SpeakingQuestionStateService
  ) {
    // Initialize with idle state
    this.state = 'idle';
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Debug attemptId changes
    if (changes['attemptId']) {
      console.log('[SpeakingAnswerBox] attemptId changed:', {
        current: changes['attemptId'].currentValue,
        previous: changes['attemptId'].previousValue,
        questionId: this.questionId,
      });
    }

    // Initialize state service if not exists
    if (changes['questionId'] && this.questionId) {
      this.speakingStateService.initializeQuestion(this.questionId);
      // Restore state for the new question
      this.restoreStateFromService();
    }

    if (changes['resetAt']) {
      // If currently recording, stop and save as draft before navigating
      if (this.state === 'recording') {
        this.stopRecording();
        // Wait a bit for the recording to be saved, then restore state
        setTimeout(() => {
          this.restoreStateFromService();
        }, 100);
      } else {
        // For speaking questions: preserve state when navigating
        this.restoreStateFromService();
      }
    }
  }

  private restoreStateFromService(): void {
    const savedState = this.speakingStateService.getQuestionState(
      this.questionId
    );
    console.log(
      `[SpeakingAnswerBox] restoreStateFromService: questionId=${this.questionId}, savedState=`,
      savedState
    );

    if (savedState) {
      // Clear previous audio URL cache
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      // Restore state from service
      this.audioBlob = savedState.audioBlob;
      this.recordingTime = savedState.recordingTime;
      this.result = savedState.result;
      this.errorMessage = savedState.errorMessage;

      console.log(
        `[SpeakingAnswerBox] Restored audioBlob:`,
        this.audioBlob ? 'EXISTS' : 'NULL'
      );
      console.log(
        `[SpeakingAnswerBox] Restored recordingTime:`,
        this.recordingTime
      );
      console.log(
        `[SpeakingAnswerBox] Restored result:`,
        this.result ? 'EXISTS' : 'NULL'
      );

      // Set component state based on saved state
      // PRIORITY: If result exists, always show submitted state regardless of saved state
      if (savedState.result) {
        this.state = 'submitted';
        console.log(
          `[SpeakingAnswerBox] Result exists, setting state to 'submitted'`
        );
      } else if (
        savedState.state === 'submitted' ||
        savedState.state === 'scored'
      ) {
        this.state = 'submitted';
      } else if (savedState.state === 'has_recording') {
        this.state = 'idle'; // Show the recording is ready to submit
      } else if (savedState.state === 'scoring') {
        // Only show processing if no result exists
        this.state = 'processing';
        console.log(
          `[SpeakingAnswerBox] No result found, setting state to 'processing' for scoring state`
        );
      } else if (savedState.state === 'in_progress') {
        this.state = 'idle'; // Reset to idle if was in progress
      } else {
        this.state = 'idle';
      }
      console.log(
        `[SpeakingAnswerBox] Restored state: component.state=${this.state}`
      );
    } else {
      // No saved state, reset component
      console.log(`[SpeakingAnswerBox] No saved state, resetting component`);
      this.resetComponent();
    }
  }

  ngOnDestroy(): void {
    this.stopRecording();
    this.clearTimer();

    // Clean up audio URL
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
  }

  async startRecording(): Promise<void> {
    if (this.disabled || this.state !== 'idle') return;

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Sử dụng webm codec vì được hỗ trợ rộng rãi
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        // Clear previous audio URL cache
        if (this.audioUrl) {
          URL.revokeObjectURL(this.audioUrl);
          this.audioUrl = null;
        }

        // Save recording to state service as draft
        if (this.audioBlob) {
          console.log(
            `[SpeakingAnswerBox] Saving recording to state service, size:`,
            this.audioBlob.size
          );
          this.speakingStateService.saveRecording(
            this.questionId,
            this.audioBlob,
            this.recordingTime
          );
        }
      };

      this.mediaRecorder.start();
      this.state = 'recording';
      this.recordingTime = 0;
      this.startTimer();
      this.toastService.info('Đang ghi âm...');

      // Update state service
      this.speakingStateService.updateQuestionState(this.questionId, {
        state: 'in_progress',
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
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

      // Save recording to state service as draft
      // Note: audioBlob will be available in mediaRecorder.onstop callback
      console.log(
        `[SpeakingAnswerBox] stopRecording called, audioBlob:`,
        this.audioBlob ? 'EXISTS' : 'NULL'
      );
    }
  }

  async submitRecording(): Promise<void> {
    if (!this.audioBlob || this.disabled) {
      this.toastService.error('Không có bản ghi âm để nộp');
      return;
    }

    this.state = 'processing';
    this.errorMessage = '';
    this.submitting.emit(true); // ← Notify parent: Bắt đầu submit

    // Immediately mark as scoring in shared state so UI shows loading when navigating away
    console.log(
      `[SpeakingAnswerBox] Marking question ${this.questionId} as 'scoring' before API call`
    );
    this.speakingStateService.markAsScoring(this.questionId);

    try {
      // Submit via service-level method to ensure continuity across navigation
      console.log(
        `[SpeakingAnswerBox] Submitting answer for question ${this.questionId} with attemptId: ${this.attemptId}`
      );

      const result = await this.speakingStateService.submitAnswerAndStore(
        this.questionId,
        this.audioBlob,
        this.attemptId // ✅ Truyền attemptId
      );

      if (result) {
        this.result = result;
        this.state = 'submitted';
        // Remove toast notification - chấm điểm ngầm, không thông báo
        // this.toastService.success('Đã nộp bài thành công!');

        // State already saved by service method

        // Emit kết quả để parent component có thể xử lý
        this.scoringResult.emit(result);
        this.answered.emit(true);
      }
    } catch (error: any) {
      console.error('Error submitting recording:', error);
      this.errorMessage =
        error?.error?.message ||
        'Đã xảy ra lỗi khi chấm điểm. Vui lòng thử lại.';
      this.state = 'error';
      this.toastService.error(this.errorMessage);
    } finally {
      this.submitting.emit(false); // ← Notify parent: Submit xong (thành công hoặc lỗi)
    }
  }

  cancelRecording(): void {
    this.stopRecording();
    this.audioBlob = null;
    this.audioChunks = [];

    // Clear audio URL cache
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }

    this.resetComponent();

    // Clear from state service
    this.speakingStateService.clearRecording(this.questionId);
  }

  private resetComponent(): void {
    this.state = 'idle';
    this.recordingTime = 0;
    this.audioBlob = null;
    this.audioChunks = [];
    this.result = null;
    this.errorMessage = '';
    this.clearTimer();
  }

  private startTimer(): void {
    this.clearTimer();
    this.recordingTimer = setInterval(() => {
      this.recordingTime++;

      // Auto-stop based on question time limit (if set) or default 120 seconds
      const timeLimit = this.questionTime > 0 ? this.questionTime : 120;
      if (this.recordingTime >= timeLimit) {
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

    return 'audio/webm'; // fallback
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.recordingTime / 60);
    const seconds = this.recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  get hasRecording(): boolean {
    return this.audioBlob !== null;
  }

  get canStartRecording(): boolean {
    return !this.disabled && (this.state === 'idle' || this.state === 'error');
  }

  get isRecording(): boolean {
    return this.state === 'recording';
  }

  get isProcessing(): boolean {
    return this.state === 'processing';
  }

  get isSubmitted(): boolean {
    return this.state === 'submitted';
  }

  get isError(): boolean {
    return this.state === 'error';
  }

  getAudioUrl(): string | null {
    if (this.audioBlob && !this.audioUrl) {
      this.audioUrl = URL.createObjectURL(this.audioBlob);
    }
    return this.audioUrl;
  }
}
