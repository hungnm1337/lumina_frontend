import { Component, Input, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionsComponent } from '../options/options.component';
import { PromptComponent } from '../prompt/prompt.component';
import { TimeComponent } from '../time/time.component';
import {
  QuestionDTO,
  OptionDTO,
  SpeakingScoringResult,
} from '../../../Interfaces/exam.interfaces';
import { Router } from '@angular/router';
import { AuthService } from '../../../Services/Auth/auth.service';
import { WritingAnswerBoxComponent } from '../writing-answer-box/writing-answer-box.component';
import { SpeakingAnswerBoxComponent } from '../speaking-answer-box/speaking-answer-box.component';
import { SpeakingSummaryComponent } from '../speaking-summary/speaking-summary.component';

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  result: SpeakingScoringResult;
}

@Component({
  selector: 'app-question',
  standalone: true,
  imports: [
    CommonModule,
    OptionsComponent,
    PromptComponent,
    TimeComponent,
    WritingAnswerBoxComponent,
    SpeakingAnswerBoxComponent,
    SpeakingSummaryComponent,
  ],
  templateUrl: './question.component.html',
})
export class QuestionComponent {
  @Input() questions: QuestionDTO[] = [];
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  savedAnswers: { questionId: number; optionId: number }[] = [];
  latestPictureCaption: string = '';
  speakingResults: Map<number, SpeakingScoringResult> = new Map();
  showSpeakingSummary = false;
  speakingQuestionResults: QuestionResult[] = [];
  isSpeakingSubmitting = false; // New: Track speaking submission status
  private advanceTimer: any = null;

  markAnswered(isCorrect: boolean): void {
    if (isCorrect) {
      const q = this.questions[this.currentIndex];
      this.totalScore += q?.scoreWeight ?? 0;
      this.correctCount += 1;
    }
    this.revealExplainAndQueueNext();
  }

  onSpeakingResult(result: SpeakingScoringResult): void {
    const q = this.questions[this.currentIndex];
    if (
      q &&
      result.overallScore !== null &&
      result.overallScore !== undefined
    ) {
      // Lưu kết quả speaking cho câu hỏi này
      this.speakingResults.set(q.questionId, result);

      // Lưu vào array để hiển thị summary
      this.speakingQuestionResults.push({
        questionNumber: this.currentIndex + 1,
        questionText: q.stemText,
        result: result,
      });

      // Tính điểm dựa trên overallScore (0-100) chuyển sang scoreWeight
      // Giả sử scoreWeight tối đa là 10, scale theo tỷ lệ
      const scoreRatio = result.overallScore / 100;
      const earnedScore = (q.scoreWeight ?? 0) * scoreRatio;
      this.totalScore += earnedScore;

      // Coi là đúng nếu điểm >= 60
      if (result.overallScore >= 60) {
        this.correctCount += 1;
      }
    }
  }

  onSpeakingSubmitting(isSubmitting: boolean): void {
    this.isSpeakingSubmitting = isSubmitting;
    console.log('[QuestionComponent] Speaking submitting:', isSubmitting);

    // Nếu submit xong và đang chờ next → next ngay
    if (!isSubmitting && this.advanceTimer) {
      console.log(
        '[QuestionComponent] Submit completed, proceeding to next question'
      );
      if (this.advanceTimer) {
        clearTimeout(this.advanceTimer);
      }

      // Nếu là câu cuối → check speaking results sau khi submit xong
      if (this.currentIndex >= this.questions.length - 1) {
        console.log(
          '[QuestionComponent] Last question, checking speaking results after submission'
        );
        // Delay một chút để đảm bảo onSpeakingResult() đã được gọi
        setTimeout(() => {
          this.checkSpeakingResultsAfterSubmission();
        }, 100);
      } else {
        this.nextQuestion();
      }
    }
  }

  onTimeout(): void {
    // Khi hết thời gian: chỉ hiển thị giải thích, KHÔNG tự động sang câu tiếp theo
    this.showExplain = true;
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
  }

  private revealExplainAndQueueNext(): void {
    if (this.showExplain) return;
    this.showExplain = true;
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
    this.advanceTimer = setTimeout(() => {
      this.nextQuestion();
    }, 300000);
  }

  private nextQuestion(): void {
    // BLOCK navigation nếu đang submit speaking answer
    if (this.isSpeakingSubmitting) {
      console.log(
        '[QuestionComponent] Blocking next question - speaking answer is being submitted'
      );
      console.log(
        '[QuestionComponent] Will auto-proceed when submission completes'
      );
      // Không next, đợi submit xong sẽ tự động next trong onSpeakingSubmitting()
      return;
    }

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.latestPictureCaption = '';
    } else {
      // Bài thi kết thúc
      this.showExplain = true;
      this.loadSavedAnswers();

      // SPEAKING TEST: Luôn hiển thị summary, KHÔNG hiển thị màn "Hoàn thành"
      if (this.hasSpeakingQuestions()) {
        console.log(
          '[QuestionComponent] Speaking test detected, showing summary only'
        );
        this.showSpeakingSummary = true;
        this.finished = false; // KHÔNG set finished = true cho Speaking test
      } else {
        // Non-speaking test → hiển thị màn "Hoàn thành" bình thường
        this.finished = true;
      }
    }
  }

  // New method: Check if test has speaking questions
  private hasSpeakingQuestions(): boolean {
    return this.questions.some((q) => q.questionType === 'SPEAKING');
  }

  // New method: Check speaking results after submission completes
  private checkSpeakingResultsAfterSubmission(): void {
    console.log(
      '[QuestionComponent] Checking speaking results after submission...'
    );
    console.log(
      '[QuestionComponent] speakingQuestionResults.length:',
      this.speakingQuestionResults.length
    );

    // SPEAKING TEST: Luôn hiển thị summary, bất kể có results hay không
    if (this.hasSpeakingQuestions()) {
      console.log(
        '[QuestionComponent] Speaking test - showing summary regardless of results'
      );
      this.showSpeakingSummary = true;
      this.finished = false; // KHÔNG hiển thị màn "Hoàn thành"
    } else {
      // Non-speaking test logic
      if (this.speakingQuestionResults.length > 0) {
        console.log(
          '[QuestionComponent] Speaking results found, showing summary'
        );
        this.showSpeakingSummary = true;
        this.finished = false;
      } else {
        console.log(
          '[QuestionComponent] No speaking results, showing completion screen'
        );
        this.finished = true;
      }
    }
  }

  next(): void {
    if (this.finished) return;
    if (this.currentIndex >= this.questions.length - 1) {
      this.finished = true;
      this.showExplain = true;
      this.loadSavedAnswers();
      return;
    }
    this.nextQuestion();
  }
  constructor(private router: Router, private authService: AuthService) {
    console.log('Questions:', this.questions);
  }

  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
  }

  get percentCorrect(): number {
    const total = this.questions?.length ?? 0;
    if (total === 0) return 0;
    return Math.round((this.correctCount / total) * 100);
  }

  get feedbackText(): string {
    const p = this.percentCorrect;
    if (p < 30) return 'Bạn cần cố gắng nhiều hơn';
    if (p < 60) return 'Lần sau bạn chắc chắn sẽ làm tốt hơn';
    return 'Bạn hãy tiếp tục phát huy nhé';
  }

  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.latestPictureCaption = '';
    this.speakingResults.clear();
    this.speakingQuestionResults = [];
    this.showSpeakingSummary = false;
    this.isSpeakingSubmitting = false; // Reset speaking submission flag
  }

  closeSpeakingSummary(): void {
    this.showSpeakingSummary = false;
    // SPEAKING TEST: KHÔNG hiển thị màn "Hoàn thành", chỉ đóng summary
    if (!this.hasSpeakingQuestions()) {
      this.finished = true;
    }
  }

  onRetrySpeakingTest(): void {
    console.log('[QuestionComponent] Retry speaking test');
    this.resetQuiz();
  }

  onTryOtherSpeakingTest(): void {
    console.log('[QuestionComponent] Try other speaking test');
    this.goToExams();
  }

  goToExams() {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  private getStorageKey(): string | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId === undefined || userId === null) return null;
    return `Answer_Reading_${userId}`;
  }

  private loadSavedAnswers(): void {
    try {
      const key = this.getStorageKey() || 'Answer_Reading_undefined';
      if (!key) {
        this.savedAnswers = [];
        return;
      }
      const raw = localStorage.getItem(key);
      if (!raw) {
        this.savedAnswers = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.savedAnswers = parsed
          .map((x: any) => ({
            questionId: Number(x?.questionId),
            optionId: Number(x?.optionId),
          }))
          .filter(
            (x: any) =>
              Number.isFinite(x.questionId) && Number.isFinite(x.optionId)
          );
      } else {
        this.savedAnswers = [];
      }
    } catch {
      this.savedAnswers = [];
    }
  }

  clearSavedAnswers(): void {
    try {
      const key = this.getStorageKey() || 'Answer_Reading_undefined';
      if (!key) return;
      localStorage.removeItem(key);
      this.savedAnswers = [];
    } catch {
      // ignore
    }
  }

  isAnswerOptionCorrect(questionId: number, optionId: number): boolean | null {
    const q = this.questions.find((x) => x.questionId === questionId);
    if (!q) return null;
    const opt = q.options?.find((o) => o.optionId === optionId);
    if (!opt || typeof opt.isCorrect !== 'boolean') return null;
    return opt.isCorrect === true;
  }
}
