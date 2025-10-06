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
} from '../../../Services/Speaking/speaking.service';
import { ToastService } from '../../../Services/Toast/toast.service';

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

  constructor(
    private speakingService: SpeakingService,
    private toastService: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetAt']) {
      // CASE 1: Đang RECORDING → Stop trước, rồi submit
      if (this.state === 'recording') {
        console.log(
          '[SpeakingAnswerBox] Auto-stopping recording due to timeout'
        );
        this.stopRecording();

        // Delay để audioBlob được tạo trong mediaRecorder.onstop
        setTimeout(() => {
          if (this.audioBlob) {
            console.log('[SpeakingAnswerBox] Auto-submitting after stop');
            this.toastService.warning('Hết thời gian! Tự động nộp bài...');
            this.submitRecording();
          }
        }, 500);
      }
      // CASE 2: Đã có audio chưa submit (user đã stop nhưng chưa kịp nộp)
      else if (
        this.audioBlob &&
        this.state !== 'submitted' &&
        this.state !== 'processing'
      ) {
        console.log(
          '[SpeakingAnswerBox] Auto-submitting existing audio due to timeout'
        );
        this.toastService.warning('Hết thời gian! Tự động nộp bài...');
        this.submitRecording();
      }
      // CASE 3: Không có gì để submit → Reset bình thường
      else {
        this.resetComponent();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopRecording();
    this.clearTimer();
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
      };

      this.mediaRecorder.start();
      this.state = 'recording';
      this.recordingTime = 0;
      this.startTimer();
      this.toastService.info('Đang ghi âm...');
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
      this.toastService.success('Đã dừng ghi âm');
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

    try {
      const result = await this.speakingService
        .submitSpeakingAnswer(this.audioBlob, this.questionId)
        .toPromise();

      if (result) {
        this.result = result;
        this.state = 'submitted';
        this.toastService.success('Đã nộp bài thành công!');

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
    this.resetComponent();
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

      // Auto-stop sau 120 giây (2 phút) và TỰ ĐỘNG SUBMIT
      if (this.recordingTime >= 120) {
        this.stopRecording();

        // Auto-submit sau khi stop (delay 500ms để đảm bảo audioBlob đã được tạo)
        setTimeout(() => {
          if (this.audioBlob) {
            this.toastService.warning('Hết thời gian! Tự động nộp bài...');
            this.submitRecording();
          }
        }, 500);
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
}
