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
import { LeaderboardService } from '../../../../Services/Leaderboard/leaderboard.service';
import { PopupComponent } from '../../../Common/popup/popup.component';

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
    PopupComponent,
  ],
  templateUrl: './listening.component.html',
  styleUrl: './listening.component.scss',
})
export class ListeningComponent implements OnChanges, OnInit, OnDestroy {
  showReportPopup = false;
  showSubmitPopup = false;
  submitPopupMessage = '';
  submitPopupTitle = '';

  // TOEIC Notification Popup
  showToeicPopup = false;
  toeicPopupMessage = '';
  toeicPopupTitle = 'Kết quả TOEIC ước tính';

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

  // Tracking time for leaderboard calculation
  examStartTime: Date | null = null;

  // Answer tracking
  answeredQuestions: Map<
    number,
    { selectedOptionId: number; isCorrect: boolean; score: number }
  > = new Map();

  // Audio
  @ViewChild('audioPlayer', { static: false })
  audioPlayer?: ElementRef<HTMLAudioElement>;
  private audioPlayCounts = new Map<number, number>(); // ✅ Track play count per questionId
  maxPlays = 1;
  isAudioPlaying = false;
  currentAudioUrl = '';
  playbackSpeed = 1.0;
  isMuted = false;
  audioCurrentTime = 0;
  audioDuration = 0;
  audioProgress = 0;

  // ✅ Getter for current question's play count
  get audioPlayCount(): number {
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    return this.audioPlayCounts.get(currentQuestionId) || 0;
  }

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
    private quotaService: QuotaService,
    private leaderboardService: LeaderboardService
  ) {}

  // Handler for report popup close
  onReportPopupClose(): void {
    console.log('[ListeningComponent] Report popup close received');
    this.showReportPopup = false;
  }

  ngOnInit(): void {
    this.loadAttemptId();
    this.incrementQuotaOnStart();
    this.examStartTime = new Date(); // Track start time for leaderboard
    this.clearCachedAudioState(); // ✅ Clear any cached audio state from previous sessions

    // ✅ Auto-play first question after component initializes
    setTimeout(() => {
      if (this.questions?.length > 0) {
        this.autoPlayAudio();
      }
    }, 500);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions?.length > 0) {
      this.resetQuiz();
    }

    // ✅ Reset audio state when navigating between questions
    if (changes['currentIndex'] && !changes['currentIndex'].firstChange) {
      this.resetAudioState();
      console.log(
        '[Listening] ✅ Audio reset on question change - audioPlayCount:',
        this.audioPlayCount
      );
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
    // ✅ Removed showExplain check to allow re-selection
    if (this.isSubmitting || !this.attemptId) return;

    const currentQuestion = this.questions[this.currentIndex];

    // ✅ Check if this question was already answered
    const previousAnswer = this.answeredQuestions.get(
      currentQuestion.questionId
    );
    const isUpdatingAnswer = previousAnswer !== undefined;

    this.isSubmitting = true;

    const model = {
      examAttemptId: this.attemptId,
      questionId: currentQuestion.questionId,
      selectedOptionId: selectedOptionId,
    };

    console.log(
      isUpdatingAnswer
        ? 'Updating listening answer:'
        : 'Submitting listening answer:',
      model
    );

    this.examAttemptService.submitListeningAnswer(model).subscribe({
      next: (response) => {
        console.log('Listening answer submitted:', response);

        // ✅ If updating answer, adjust previous scores first
        if (isUpdatingAnswer) {
          if (previousAnswer.isCorrect) {
            this.correctCount--;
          }
          this.totalScore -= previousAnswer.score;
          console.log('Adjusted scores - removed previous answer contribution');
        }

        // Store new answer info
        this.answeredQuestions.set(currentQuestion.questionId, {
          selectedOptionId: selectedOptionId,
          isCorrect: response.isCorrect,
          score: response.score,
        });

        // Update totals with new answer
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
      // ✅ Auto-play audio when navigating
      this.autoPlayAudio();
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.updateExplainState();
      this.resetAudioState();
      // ✅ Auto-play audio when navigating
      this.autoPlayAudio();
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
      // ✅ Auto-play audio when navigating
      this.autoPlayAudio();
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
    if (!this.audioPlayer) return;

    const audio = this.audioPlayer.nativeElement;
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    const currentCount = this.audioPlayCounts.get(currentQuestionId) || 0;

    // ✅ Nếu đang phát -> DỪNG LẠI (pause)
    if (!audio.paused && this.isAudioPlaying) {
      audio.pause();
      this.isAudioPlaying = false;
      console.log(`[Listening] ⏸️ Audio paused Q${currentQuestionId}`);
      return;
    }

    // ✅ Nếu đã dừng và có progress -> TIẾP TỤC phát (không tăng count)
    // Cho phép resume ngay cả khi đang ở lần nghe thứ 2
    if (
      audio.paused &&
      audio.currentTime > 0 &&
      audio.currentTime < audio.duration
    ) {
      audio
        .play()
        .then(() => {
          this.isAudioPlaying = true;
          console.log(`[Listening] ▶️ Audio resumed Q${currentQuestionId}`);
        })
        .catch((error) => {
          console.error('[Listening] Error resuming audio:', error);
          alert('Không thể tiếp tục phát audio. Vui lòng thử lại.');
        });
      return;
    }

    // ✅ Nếu muốn PHÁT MỚI nhưng đã hết lượt
    if (currentCount >= this.maxPlays) {
      alert(`Bạn chỉ được nghe tối đa ${this.maxPlays} lần!`);
      return;
    }

    // ✅ PHÁT MỚI từ đầu (tăng count)
    audio.currentTime = 0;
    this.audioPlayCounts.set(currentQuestionId, currentCount + 1);
    this.isAudioPlaying = true;

    audio
      .play()
      .then(() => {
        console.log(
          `[Listening] 🔊 Audio playing Q${currentQuestionId} (${this.audioPlayCounts.get(
            currentQuestionId
          )}/${this.maxPlays})`
        );
      })
      .catch((error) => {
        console.error('[Listening] Error playing audio:', error);
        // ✅ Nếu lỗi, giảm counter lại
        this.audioPlayCounts.set(currentQuestionId, currentCount);
        this.isAudioPlaying = false;
        alert('Không thể phát audio. Vui lòng thử lại.');
      });
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
    // ✅ Don't reset audioPlayCounts - it's managed per question now
    this.isAudioPlaying = false;
    this.audioCurrentTime = 0;
    this.audioDuration = 0;
    this.audioProgress = 0;

    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      audio.pause();
      audio.currentTime = 0;
      audio.load();
      const currentQuestionId = this.questions[this.currentIndex]?.questionId;
      console.log(
        `[Listening] 🔄 Audio state reset for Q${currentQuestionId} - Play count: ${this.audioPlayCount}/${this.maxPlays}`
      );
    }
  }

  // ✅ Auto-play audio when navigating to a new question
  private autoPlayAudio(): void {
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    const currentCount = this.audioPlayCounts.get(currentQuestionId) || 0;

    // Chỉ tự động phát nếu chưa từng nghe câu này
    if (currentCount === 0) {
      setTimeout(() => {
        this.playAudio();
      }, 300); // Delay nhỏ để đảm bảo audio đã load
    }
  }

  // ✅ Clear any cached audio state from localStorage or previous sessions
  private clearCachedAudioState(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (
          key.startsWith('audioPlayCount_') ||
          key.startsWith('listening_audio_')
        ) {
          localStorage.removeItem(key);
        }
      });
      console.log(
        '[Listening] ✅ Cleared cached audio state from localStorage'
      );
    } catch (error) {
      console.error('[Listening] Error clearing cached audio state:', error);
    }
  }

  // ============= QUIZ COMPLETION =============

  finishExamManual(): void {
    const answeredCount = this.answeredQuestions.size;
    const totalQuestions = this.questions.length;
    const unansweredCount = totalQuestions - answeredCount;

    this.submitPopupTitle = 'Xác nhận nộp bài';
    let message = `Bạn có chắc chắn muốn nộp bài thi ${
      this.partInfo?.partCode || 'Listening'
    } không?\nSố câu đã trả lời: ${answeredCount}/${totalQuestions}`;

    if (unansweredCount > 0) {
      message += `\nSố câu chưa trả lời: ${unansweredCount}\nCác câu chưa trả lời sẽ không được tính điểm!`;
    }

    this.submitPopupMessage = message;
    this.showSubmitPopup = true;
  }

  onSubmitConfirmed(): void {
    this.showSubmitPopup = false;
    this.finishQuiz();
  }

  onSubmitCancelled(): void {
    this.showSubmitPopup = false;
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

        // 🎯 CALCULATE LEADERBOARD SCORE (CHỈ LISTENING)
        this.calculateLeaderboardScore();
      },
      error: (error) => {
        console.error('Error finalizing listening exam:', error);
        this.finished = true;
      },
    });
  }

  // ============= LEADERBOARD INTEGRATION =============

  private calculateLeaderboardScore(): void {
    if (!this.attemptId || !this.partInfo) {
      console.log(
        '⚠️ Missing attemptId or partInfo for leaderboard calculation'
      );
      return;
    }

    // Chỉ tính điểm cho Listening (ExamPartId = 1)
    // Sử dụng partId từ partInfo
    const examPartId = 1; // Listening

    const timeSpentSeconds = this.calculateTimeSpent();
    const expectedTimeSeconds = 45 * 60; // 45 phút cho Listening

    const request = {
      examAttemptId: this.attemptId,
      examPartId: examPartId,
      correctAnswers: this.correctCount,
      totalQuestions: this.questions.length,
      timeSpentSeconds: timeSpentSeconds,
      expectedTimeSeconds: expectedTimeSeconds,
    };

    console.log('📊 [Listening] Calculating leaderboard score:', request);
    console.log('   - AttemptId:', this.attemptId);
    console.log('   - CorrectAnswers:', this.correctCount);
    console.log('   - TotalQuestions:', this.questions.length);
    console.log('   - ExamPartId:', examPartId);

    this.leaderboardService.calculateScore(request).subscribe({
      next: (response) => {
        console.log(
          '✅ [Listening] Leaderboard score calculated successfully:',
          response
        );
        console.log('   - SeasonScore:', response.seasonScore);
        console.log(
          '   - TotalAccumulatedScore:',
          response.totalAccumulatedScore
        );

        // Hiển thị thông báo TOEIC
        if (response.toeicMessage) {
          this.showTOEICNotification(response);
        }

        // Thông báo nếu làm lần đầu
        if (response.isFirstAttempt) {
          console.log(
            '🎯 Lần đầu làm đề này! TOEIC đã được cập nhật:',
            response.estimatedTOEIC
          );
        } else {
          console.log('🔄 Làm lại đề cũ. Điểm tích lũy tăng, TOEIC giữ nguyên');
        }
      },
      error: (error) => {
        console.error(
          '❌ [Listening] Error calculating leaderboard score:',
          error
        );
        console.error('   - Error details:', JSON.stringify(error, null, 2));
        // Không block user flow nếu API lỗi
      },
    });
  }

  private calculateTimeSpent(): number {
    if (!this.examStartTime) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - this.examStartTime.getTime()) / 1000);
  }

  private showTOEICNotification(response: any): void {
    const message = `
${response.toeicMessage}

📊 Thông tin chi tiết:
• Điểm lần này: ${response.seasonScore}
• Tổng điểm tích lũy: ${response.totalAccumulatedScore}
• TOEIC ước tính: ${response.estimatedTOEIC}
• Trình độ: ${response.toeicLevel}
${
  response.isFirstAttempt
    ? '\n🎯 Lần đầu làm đề này!'
    : '\n🔄 Làm lại đề - TOEIC giữ nguyên'
}
    `.trim();

    this.toeicPopupMessage = message;
    this.showToeicPopup = true;
  }

  closeToeicPopup(): void {
    this.showToeicPopup = false;
  }

  private showLevelUpNotification(
    newLevel: string,
    previousLevel?: string
  ): void {
    const levelText = this.leaderboardService.getTOEICLevelText(newLevel);
    const icon = this.leaderboardService.getTOEICLevelIcon(newLevel);

    alert(
      `${icon} CHÚC MẬNG!\n\nBạn đã lên cấp độ: ${levelText}\n${
        previousLevel
          ? `Từ: ${this.leaderboardService.getTOEICLevelText(previousLevel)}`
          : ''
      }\n\nHãy tiếp tục phát huy!`
    );
  }

  private showMilestoneNotification(milestone: number): void {
    alert(
      `🎯 THÀNH TÍCH MỚI!\n\nBạn đã đạt mốc ${milestone} điểm TOEIC ước tính!\n\nChúc mừng bạn!`
    );
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
