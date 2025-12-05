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
import { SidebarService } from '../../../../Services/sidebar.service';
import {
  QuestionNavigatorComponent,
  NavigatorLegendItem,
} from '../../question-navigator/question-navigator.component';
import { TimeComponent } from '../../time/time.component';

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
    QuestionNavigatorComponent,
    TimeComponent,
  ],
  templateUrl: './listening.component.html',
  styleUrl: './listening.component.scss',
})
export class ListeningComponent implements OnChanges, OnInit, OnDestroy {
  showReportPopup = false;
  showSubmitPopup = false;
  submitPopupMessage = '';
  submitPopupTitle = '';

  showToeicPopup = false;
  toeicPopupMessage = '';
  toeicPopupTitle = 'Kết quả TOEIC ước tính';

  get examId(): number | null {
    return this.partInfo?.examId ?? null;
  }
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() listeningAnswered = new EventEmitter<boolean>();

  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  attemptId: number | null = null;
  isSubmitting = false;

  examStartTime: Date | null = null;

  answeredQuestions: Map<
    number,
    { selectedOptionId: number; isCorrect: boolean; score: number }
  > = new Map();

  @ViewChild('audioPlayer', { static: false })
  audioPlayer?: ElementRef<HTMLAudioElement>;
  private audioPlayCounts = new Map<number, number>();
  maxPlays = 1;
  isAudioPlaying = false;
  currentAudioUrl = '';
  playbackSpeed = 1.0;
  isMuted = false;
  audioCurrentTime = 0;
  audioDuration = 0;
  audioProgress = 0;

  get audioPlayCount(): number {
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    return this.audioPlayCounts.get(currentQuestionId) || 0;
  }

  examAttemptDetails: ExamAttemptDetailResponseDTO | null = null;
  showExamAttemptDetailsFlag = false;

  showQuotaModal = false;
  quotaMessage = '';

  // Timer management - Part-based countdown
  partTotalTime: number = 0;
  timerResetTrigger: number = 0;
  hasShownTimeWarning = false;

  // Navigator configuration
  navigatorLegendItems: NavigatorLegendItem[] = [
    { color: 'bg-gray-200', label: 'Chưa làm' },
    { color: 'bg-green-500', label: 'Đã làm' },
    { color: 'bg-blue-600', label: 'Đang làm' },
  ];

  getQuestionStatus = (questionId: number, index: number): string => {
    if (index === this.currentIndex) return 'current';
    if (this.isQuestionAnswered(questionId)) return 'answered';
    return 'unanswered';
  };

  constructor(
    private router: Router,
    private examAttemptService: ExamAttemptService,
    private authService: AuthService,
    private quotaService: QuotaService,
    private leaderboardService: LeaderboardService,
    private sidebarService: SidebarService
  ) {}

  onReportPopupClose(): void {
    this.showReportPopup = false;
  }

  ngOnInit(): void {
    this.loadAttemptId();
    this.incrementQuotaOnStart();
    this.examStartTime = new Date();
    this.clearCachedAudioState();
    this.sidebarService.hideSidebar(); // Ẩn sidebar khi bắt đầu làm bài
    this.initializePartTimer(); // Initialize countdown timer

    setTimeout(() => {
      if (this.questions?.length > 0) {
        this.autoPlayAudio();
      }
    }, 500);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions?.length > 0) {
      this.resetQuiz();
      this.initializePartTimer(); // Re-initialize timer when questions change
    }

    if (changes['currentIndex'] && !changes['currentIndex'].firstChange) {
      this.resetAudioState();
    }
  }

  ngOnDestroy(): void {
    this.saveProgressOnExit();
    this.sidebarService.showSidebar(); // Hiển thị lại sidebar khi thoát
  }

  // ============= TIMER MANAGEMENT =============

  // Calculate total time for part (sum of all question times)
  private calculatePartTotalTime(): number {
    if (!this.questions || this.questions.length === 0) return 0;
    return this.questions.reduce((total, question) => {
      return total + (question.time || 0);
    }, 0);
  }

  // Initialize timer when starting the part
  private initializePartTimer(): void {
    this.partTotalTime = this.calculatePartTotalTime();
    this.timerResetTrigger = Date.now(); // Force timer reset
    this.hasShownTimeWarning = false;
    console.log(`🕐 Listening Part timer initialized: ${this.partTotalTime}s`);
  }

  // Handle timer tick events
  onPartTimerTick(remainingTime: number): void {
    // Show warning at 30 seconds
    if (remainingTime <= 30 && !this.hasShownTimeWarning) {
      this.hasShownTimeWarning = true;
      console.log('⚠️ Listening: 30 seconds remaining!');
    }
  }

  // Handle timeout - auto submit
  onPartTimeout(): void {
    console.log('⏱️ Listening time expired!');
    this.submitPopupTitle = 'Hết thời gian!';
    this.submitPopupMessage =
      'Thời gian làm bài đã hết. Bài thi sẽ được nộp tự động.';
    this.showSubmitPopup = true;
    // Auto submit after showing popup
    setTimeout(() => {
      this.showSubmitPopup = false;
      this.finishExamByTimeout();
    }, 2000);
  }

  // Finish exam due to timeout - auto submit to get score
  private finishExamByTimeout(): void {
    console.log('🏁 Auto-submitting Listening exam due to timeout...');
    this.finishQuiz();
  }

  private loadAttemptId(): void {
    try {
      const stored = localStorage.getItem('currentExamAttempt');

      if (!stored) {
        this.createNewAttempt();
        return;
      }

      const parsed = JSON.parse(stored);
      this.attemptId = parsed.attemptID || parsed.attemptId || null;

      if (this.attemptId === null || this.attemptId <= 0) {
        this.createNewAttempt();
      }
    } catch (error) {
      this.createNewAttempt();
    }
  }

  private createNewAttempt(): void {
    if (!this.partInfo || !this.partInfo.examId || !this.partInfo.partId) {
      alert('Lỗi: Không thể khởi tạo bài thi. Vui lòng quay lại và thử lại.');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
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
        this.attemptId = response.attemptID;
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));
      },
      error: (error) => {
        alert('Lỗi khi khởi tạo bài thi. Vui lòng thử lại.');
      },
    });
  }

  private incrementQuotaOnStart(): void {
    this.quotaService.incrementQuota('listening').subscribe({
      next: () => {},
      error: (err) => {
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

  markAnswered(selectedOptionId: number): void {
    if (this.isSubmitting || !this.attemptId) return;

    const currentQuestion = this.questions[this.currentIndex];

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

    this.examAttemptService.submitListeningAnswer(model).subscribe({
      next: (response) => {
        if (isUpdatingAnswer) {
          if (previousAnswer.isCorrect) {
            this.correctCount--;
          }
          this.totalScore -= previousAnswer.score;
        }

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
        this.isSubmitting = false;
      },
    });
  }

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateExplainState();
      this.resetAudioState();
      this.autoPlayAudio();
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.updateExplainState();
      this.resetAudioState();
      this.autoPlayAudio();
    } else {
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
      this.autoPlayAudio();
    }
  }

  private updateExplainState(): void {
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    this.showExplain = this.answeredQuestions.has(currentQuestionId);
  }

  getCurrentAudioUrl(): string {
    return this.questions[this.currentIndex]?.prompt?.referenceAudioUrl || '';
  }

  playAudio(): void {
    if (!this.audioPlayer) return;

    const audio = this.audioPlayer.nativeElement;
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    const currentCount = this.audioPlayCounts.get(currentQuestionId) || 0;

    if (!audio.paused && this.isAudioPlaying) {
      audio.pause();
      this.isAudioPlaying = false;
      return;
    }

    if (
      audio.paused &&
      audio.currentTime > 0 &&
      audio.currentTime < audio.duration
    ) {
      audio
        .play()
        .then(() => {
          this.isAudioPlaying = true;
        })
        .catch((error) => {
          alert('Không thể tiếp tục phát audio. Vui lòng thử lại.');
        });
      return;
    }

    if (currentCount >= this.maxPlays) {
      alert(`Bạn chỉ được nghe tối đa ${this.maxPlays} lần!`);
      return;
    }

    audio.currentTime = 0;
    this.audioPlayCounts.set(currentQuestionId, currentCount + 1);
    this.isAudioPlaying = true;

    audio
      .play()
      .then(() => {})
      .catch((error) => {
        this.audioPlayCounts.set(currentQuestionId, currentCount);
        this.isAudioPlaying = false;
        alert('Không thể phát audio. Vui lòng thử lại.');
      });
  }

  onAudioPlay(): void {
    this.isAudioPlaying = true;
  }

  onAudioEnded(): void {
    this.isAudioPlaying = false;
    this.audioProgress = 100;
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

  private resetAudioState(): void {
    this.isAudioPlaying = false;
    this.audioCurrentTime = 0;
    this.audioDuration = 0;
    this.audioProgress = 0;

    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }
  }

  private autoPlayAudio(): void {
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    const currentCount = this.audioPlayCounts.get(currentQuestionId) || 0;

    if (currentCount === 0) {
      setTimeout(() => {
        this.playAudio();
      }, 300);
    }
  }

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
    } catch (error) {}
  }

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
      this.finished = true;
      return;
    }

    this.examAttemptService.finalizeAttempt(this.attemptId).subscribe({
      next: (summary) => {
        if (summary.success !== false) {
          this.totalScore = summary.totalScore ?? this.totalScore;
          this.correctCount = summary.correctAnswers ?? this.correctCount;
        }

        this.finished = true;
        localStorage.removeItem('currentExamAttempt');

        this.calculateLeaderboardScore();
      },
      error: (error) => {
        this.finished = true;
      },
    });
  }

  private calculateLeaderboardScore(): void {
    if (!this.attemptId || !this.partInfo) {
      return;
    }

    const examPartId = 1;

    const timeSpentSeconds = this.calculateTimeSpent();
    const expectedTimeSeconds = 45 * 60;

    const request = {
      examAttemptId: this.attemptId,
      examPartId: examPartId,
      correctAnswers: this.correctCount,
      totalQuestions: this.questions.length,
      timeSpentSeconds: timeSpentSeconds,
      expectedTimeSeconds: expectedTimeSeconds,
    };

    this.leaderboardService.calculateScore(request).subscribe({
      next: (response) => {
        if (response.toeicMessage) {
          this.showTOEICNotification(response);
        }
      },
      error: (error) => {},
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

  showExamAttemptDetails(): void {
    if (!this.attemptId) return;

    this.examAttemptService.getAttemptDetails(this.attemptId).subscribe({
      next: (details) => {
        this.examAttemptDetails = details;
        this.showExamAttemptDetailsFlag = true;
      },
      error: (error) => {},
    });
  }

  closeExamAttemptDetails(): void {
    this.showExamAttemptDetailsFlag = false;
  }

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
        next: () => {},
        error: (error) => {},
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
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
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
    this.sidebarService.showSidebar(); // Hiển thị lại sidebar
    this.router.navigate(['homepage/user-dashboard/exams']);
  }
}
