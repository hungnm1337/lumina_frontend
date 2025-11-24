import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportPopupComponent } from '../../Report/report-popup/report-popup.component';
import { Router } from '@angular/router';
import { OptionsComponent } from '../../options/options.component';
import { PromptComponent } from '../../prompt/prompt.component';
import { AuthService } from '../../../../Services/Auth/auth.service';
import {
  QuestionDTO,
  ExamPartDTO,
} from '../../../../Interfaces/exam.interfaces';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ExamAttemptDetailComponent } from '../../ExamAttempt/exam-attempt-detail/exam-attempt-detail.component';
import { QuotaService } from '../../../../Services/Quota/quota.service';
import { QuotaLimitModalComponent } from '../../quota-limit-modal/quota-limit-modal.component';

@Component({
  selector: 'app-listening',
  standalone: true,
  imports: [
    CommonModule,
    OptionsComponent,
    PromptComponent,
    ExamAttemptDetailComponent,
    QuotaLimitModalComponent,
    ReportPopupComponent,
  ],
  templateUrl: './listening.component.html',
  styleUrl: './listening.component.scss',
})
export class ListeningComponent implements OnChanges, OnInit, OnDestroy {
  showReportPopup = false;
  get examId(): number | null {
    return this.partInfo?.examId ?? null;
  }
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() listeningAnswered = new EventEmitter<boolean>();

  // State
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  attemptId: number | null = null;
  isSubmitting = false;

  // Answer tracking
  answeredQuestions: Map<
    number,
    { selectedOptionId: number; isCorrect: boolean; score: number }
  > = new Map();

  // Audio
  @ViewChild('audioPlayer', { static: false })
  audioPlayer?: ElementRef<HTMLAudioElement>;
  audioPlayCount = 0;
  maxPlays = 2;
  isAudioPlaying = false;
  currentAudioUrl = '';
  playbackSpeed = 1.0;
  isMuted = false;
  audioCurrentTime = 0;
  audioDuration = 0;
  audioProgress = 0;

  // Exam history
  examAttemptDetails: ExamAttemptDetailResponseDTO | null = null;
  showExamAttemptDetailsFlag = false;

  // Quota modal
  showQuotaModal = false;
  quotaMessage = '';

  constructor(
    private router: Router,
    private examAttemptService: ExamAttemptService,
    private authService: AuthService,
    private quotaService: QuotaService
  ) {}

  // Handler for report popup close
  onReportPopupClose(): void {
    console.log('[ListeningComponent] Report popup close received');
    this.showReportPopup = false;
  }

  ngOnInit(): void {
    this.loadAttemptId();
    this.incrementQuotaOnStart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions?.length > 0) {
      this.resetQuiz();
    }
  }

  ngOnDestroy(): void {
    this.saveProgressOnExit();
  }

  // ============= ATTEMPT MANAGEMENT =============

  private loadAttemptId(): void {
    try {
      const stored = localStorage.getItem('currentExamAttempt');

      if (!stored) {
        console.warn('[Listening] ⚠️ No currentExamAttempt in localStorage');
        this.createNewAttempt();
        return;
      }

      const parsed = JSON.parse(stored);
      this.attemptId = parsed.attemptID || parsed.attemptId || null;

      if (this.attemptId === null || this.attemptId <= 0) {
        console.error('[Listening] ❌ Invalid attemptId:', this.attemptId);
        this.createNewAttempt();
      } else {
        console.log('[Listening] ✅ Loaded attemptId:', this.attemptId);
      }
    } catch (error) {
      console.error('[Listening] ❌ Error loading attemptId:', error);
      this.createNewAttempt();
    }
  }

  private createNewAttempt(): void {
    console.log('[Listening] 🆕 Creating new exam attempt...');

    if (!this.partInfo || !this.partInfo.examId || !this.partInfo.partId) {
      console.error('[Listening] ❌ Cannot create attempt: Missing partInfo');
      alert('Lỗi: Không thể khởi tạo bài thi. Vui lòng quay lại và thử lại.');
      return;
    }

    // Get current user from AuthService
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('[Listening] ❌ No user ID found');
      alert('Vui lòng đăng nhập để làm bài thi.');
      this.router.navigate(['/auth/login']);
      return;
    }

    const attemptRequest = {
      attemptID: 0,
      userID: Number(currentUser.id),
      examID: this.partInfo.examId,
      examPartId: this.partInfo.partId,
      startTime: new Date().toISOString(),
      endTime: null,
      score: null,
      status: 'In Progress',
    };

    this.examAttemptService.startExam(attemptRequest).subscribe({
      next: (response) => {
        console.log('[Listening] ✅ New attempt created:', response);
        this.attemptId = response.attemptID;

        // Lưu vào localStorage
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));
      },
      error: (error) => {
        console.error('[Listening] ❌ Error creating attempt:', error);
        alert('Lỗi khi khởi tạo bài thi. Vui lòng thử lại.');
      },
    });
  }

  private incrementQuotaOnStart(): void {
    this.quotaService.incrementQuota('listening').subscribe({
      next: () => {
        console.log('✅ Listening quota incremented');
      },
      error: (err) => {
        console.error('❌ Failed to increment quota:', err);
        if (err.status === 400 || err.status === 403) {
          this.quotaMessage =
            'Bạn đã hết lượt thi Listening miễn phí (20 lượt/tháng). Vui lòng nâng cấp Premium để tiếp tục!';
          this.showQuotaModal = true;
        }
      },
    });
  }

  closeQuotaModal(): void {
    this.showQuotaModal = false;
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  // ============= ANSWER SUBMISSION =============

  markAnswered(selectedOptionId: number): void {
    if (this.isSubmitting || this.showExplain || !this.attemptId) return;

    const currentQuestion = this.questions[this.currentIndex];
    this.isSubmitting = true;

    const model = {
      examAttemptId: this.attemptId,
      questionId: currentQuestion.questionId,
      selectedOptionId: selectedOptionId,
    };

    console.log('Submitting listening answer:', model);

    this.examAttemptService.submitListeningAnswer(model).subscribe({
      next: (response) => {
        console.log('Listening answer submitted:', response);

        this.answeredQuestions.set(currentQuestion.questionId, {
          selectedOptionId: selectedOptionId,
          isCorrect: response.isCorrect,
          score: response.score,
        });

        if (response.isCorrect) {
          this.correctCount++;
        }
        this.totalScore += response.score;

        this.isSubmitting = false;
        this.showExplain = true;

        this.listeningAnswered.emit(response.isCorrect);
      },
      error: (error) => {
        console.error('Error submitting listening answer:', error);
        this.isSubmitting = false;
      },
    });
  }

  // ============= NAVIGATION =============

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateExplainState();
      this.resetAudioState();
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.updateExplainState();
    } else {
      // Nếu là câu cuối, hỏi có muốn nộp bài không
      const confirmFinish = confirm(
        'Đây là câu cuối cùng. Bạn có muốn nộp bài ngay không?\n\n' +
          'Chọn "OK" để nộp bài\n' +
          'Chọn "Cancel" để xem lại các câu trước'
      );
      if (confirmFinish) {
        this.finishQuiz();
      }
    }
  }

  navigateToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.updateExplainState();
      this.resetAudioState();
    }
  }

  private updateExplainState(): void {
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    this.showExplain = this.answeredQuestions.has(currentQuestionId);
  }

  // ============= AUDIO PLAYER =============

  getCurrentAudioUrl(): string {
    return this.questions[this.currentIndex]?.prompt?.referenceAudioUrl || '';
  }

  playAudio(): void {
    if (this.audioPlayCount >= this.maxPlays) {
      alert(`Bạn chỉ được nghe tối đa ${this.maxPlays} lần!`);
      return;
    }

    if (this.audioPlayer) {
      const audio = this.audioPlayer.nativeElement;

      // ✅ Pause audio hiện tại nếu đang phát
      if (!audio.paused) {
        audio.pause();
      }

      // ✅ Reset về đầu
      audio.currentTime = 0;

      // ✅ Tăng counter trước khi phát
      this.audioPlayCount++;
      this.isAudioPlaying = true;

      // ✅ Phát audio từ đầu
      audio
        .play()
        .then(() => {
          console.log(
            `[Listening] Audio playing (${this.audioPlayCount}/${this.maxPlays})`
          );
        })
        .catch((error) => {
          console.error('[Listening] Error playing audio:', error);
          // ✅ Nếu lỗi, giảm counter lại
          this.audioPlayCount--;
          this.isAudioPlaying = false;
          alert('Không thể phát audio. Vui lòng thử lại.');
        });
    }
  }

  onAudioPlay(): void {
    this.isAudioPlaying = true;
    console.log('[Listening] Audio started playing');
  }

  onAudioEnded(): void {
    this.isAudioPlaying = false;
    this.audioProgress = 100;
    console.log('[Listening] Audio playback ended');
  }

  onTimeUpdate(): void {
    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      this.audioCurrentTime = audio.currentTime;
      this.audioDuration = audio.duration || 0;

      if (this.audioDuration > 0) {
        this.audioProgress = (this.audioCurrentTime / this.audioDuration) * 100;
      }
    }
  }

  onLoadedMetadata(): void {
    if (this.audioPlayer?.nativeElement) {
      this.audioDuration = this.audioPlayer.nativeElement.duration;
    }
  }

  formatAudioTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  changePlaybackSpeed(): void {
    if (this.playbackSpeed === 1.0) this.playbackSpeed = 1.25;
    else if (this.playbackSpeed === 1.25) this.playbackSpeed = 1.5;
    else if (this.playbackSpeed === 1.5) this.playbackSpeed = 0.75;
    else this.playbackSpeed = 1.0;

    if (this.audioPlayer) {
      this.audioPlayer.nativeElement.playbackRate = this.playbackSpeed;
    }
  }

  toggleVolume(): void {
    this.isMuted = !this.isMuted;
    if (this.audioPlayer) {
      this.audioPlayer.nativeElement.muted = this.isMuted;
    }
  }

  private resetAudioState(): void {
    this.audioPlayCount = 0;
    this.isAudioPlaying = false;
    this.audioCurrentTime = 0;
    this.audioDuration = 0;
    this.audioProgress = 0;

    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      audio.pause();
      audio.currentTime = 0;
      audio.load();
      console.log('[Listening] Audio state reset');
    }
  }

  // ============= QUIZ COMPLETION =============

  finishExamManual(): void {
    const answeredCount = this.answeredQuestions.size;
    const totalQuestions = this.questions.length;
    const unansweredCount = totalQuestions - answeredCount;

    let message = 'Bạn có chắc chắn muốn nộp bài thi Listening không?\n\n';
    message += `Số câu đã trả lời: ${answeredCount}/${totalQuestions}\n`;

    if (unansweredCount > 0) {
      message += `Số câu chưa trả lời: ${unansweredCount}\n`;
      message += `Các câu chưa trả lời sẽ không được tính điểm!\n\n`;
    }

    message += 'Chọn "OK" để nộp bài hoặc "Cancel" để tiếp tục làm bài.';

    const confirmResult = confirm(message);

    if (confirmResult) {
      this.finishQuiz();
    }
  }

  private finishQuiz(): void {
    if (!this.attemptId) {
      console.error('No attemptId, cannot finalize');
      this.finished = true;
      return;
    }

    console.log('🏁 Finalizing listening exam...');

    this.examAttemptService.finalizeAttempt(this.attemptId).subscribe({
      next: (summary) => {
        console.log('Listening exam finalized:', summary);

        // Use backend scores
        if (summary.success !== false) {
          this.totalScore = summary.totalScore ?? this.totalScore;
          this.correctCount = summary.correctAnswers ?? this.correctCount;
        }

        this.finished = true;
        localStorage.removeItem('currentExamAttempt');
      },
      error: (error) => {
        console.error('Error finalizing listening exam:', error);
        this.finished = true;
      },
    });
  }

  // ============= EXAM HISTORY =============

  showExamAttemptDetails(): void {
    if (!this.attemptId) return;

    this.examAttemptService.getAttemptDetails(this.attemptId).subscribe({
      next: (details) => {
        this.examAttemptDetails = details;
        this.showExamAttemptDetailsFlag = true;
        console.log('Fetched exam attempt details:', details);
      },
      error: (error) => {
        console.error('Error fetching exam attempt details:', error);
      },
    });
  }

  closeExamAttemptDetails(): void {
    this.showExamAttemptDetailsFlag = false;
  }

  // ============= HELPERS =============

  getSelectedOptionId(questionId: number): number | null {
    return this.answeredQuestions.get(questionId)?.selectedOptionId ?? null;
  }

  isQuestionAnswered(questionId: number): boolean {
    return this.answeredQuestions.has(questionId);
  }

  get percentCorrect(): number {
    const total = this.questions?.length || 0;
    return total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
  }

  get feedbackText(): string {
    const p = this.percentCorrect;
    if (p < 30) return 'Cần cố gắng nhiều hơn';
    if (p < 60) return 'Khá tốt, tiếp tục cố gắng';
    if (p < 80) return 'Rất tốt!';
    return 'Xuất sắc!';
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  // ============= EXIT HANDLING =============

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (!this.finished && this.attemptId) {
      $event.returnValue = 'Bạn có muốn lưu tiến trình và thoát không?';
    }
  }

  private saveProgressOnExit(): void {
    if (!this.finished && this.attemptId) {
      const model = {
        examAttemptId: this.attemptId,
        currentQuestionIndex: this.currentIndex,
      };

      this.examAttemptService.saveProgress(model).subscribe({
        next: () => console.log('Listening progress saved'),
        error: (error) => console.error('Error saving progress:', error),
      });
    }
  }

  confirmExit(): void {
    const confirmResult = confirm(
      'Bạn có muốn lưu tiến trình và thoát không?\n\n' +
        '- Chọn "OK" để lưu và thoát\n' +
        '- Chọn "Cancel" để tiếp tục làm bài'
    );

    if (confirmResult) {
      this.saveProgressAndExit();
    }
  }

  private saveProgressAndExit(): void {
    if (!this.attemptId) {
      this.router.navigate(['homepage/user-dashboard/exams']);
      return;
    }

    const model = {
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentIndex,
    };

    this.examAttemptService.saveProgress(model).subscribe({
      next: () => {
        console.log('Listening progress saved successfully');
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('Error saving listening progress:', error);
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
    });
  }

  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.answeredQuestions.clear();
    this.resetAudioState();
  }

  goToExams(): void {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }
}
