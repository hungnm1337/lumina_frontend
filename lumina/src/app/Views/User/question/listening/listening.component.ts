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
import { OptionsComponent } from '../../options/options.component';
import { TimeComponent } from '../../time/time.component';
import { PromptComponent } from '../../prompt/prompt.component';
import {
  QuestionDTO,
  ExamPartDTO,
  OptionDTO,
} from '../../../../Interfaces/exam.interfaces';
import { Router } from '@angular/router';

interface ListeningSavedAnswer {
  questionId: number;
  selectedOptionId: number | null;
  isCorrect: boolean;
  timestamp: number;
}

@Component({
  selector: 'app-listening',
  standalone: true,
  imports: [CommonModule, OptionsComponent, TimeComponent, PromptComponent],
  templateUrl: './listening.component.html',
  styleUrl: './listening.component.scss',
})
export class ListeningComponent implements OnChanges, OnInit, OnDestroy {
  // ============= INPUTS/OUTPUTS (giống ReadingComponent) =============
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() listeningAnswered = new EventEmitter<boolean>();

  // ============= AUDIO PLAYER CONTROLS =============
  @ViewChild('audioElement', { static: false })
  audioElement?: ElementRef<HTMLAudioElement>;

  isAudioPlaying = false;
  audioPlayCount = 0;
  maxPlays = 2; // Giới hạn nghe tối đa 2 lần (có thể config)
  canReplay = true; // Cho phép nghe lại

  // Audio progress tracking
  currentTime = 0;
  duration = 0;
  audioProgress = 0;

  // Audio settings
  playbackSpeed = 1.0;
  isMuted = false;

  // ============= NAVIGATION & STATE (từ ReadingComponent) =============
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;

  // ✅ NEW: Track saved answers for restore
  savedAnswers: ListeningSavedAnswer[] = [];

  // ============= LEGACY SUPPORT (backward compatibility) =============
  @Input() options: OptionDTO[] = [];
  @Input() disabled: boolean = false;
  @Output() answered = new EventEmitter<boolean>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadSavedAnswers();
    console.log('✅ ListeningComponent initialized:', {
      questionsCount: this.questions.length,
      partInfo: this.partInfo,
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions?.length > 0) {
      console.log('📊 Questions changed:', this.questions);
      this.loadSavedAnswers();
      this.resetAudioState();
    }

    if (changes['currentIndex']) {
      this.resetAudioState();
    }
  }

  ngOnDestroy(): void {
    this.pauseAudio();
  }

  // ============= KEYBOARD SHORTCUTS =============
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ignore if user is typing in input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Prevent default for keyboard shortcuts
    const key = event.key.toLowerCase();

    switch (key) {
      case ' ': // Space: Play/Pause
        event.preventDefault();
        if (!this.showExplain) {
          this.playAudio();
        }
        break;

      case 'a': // A: Select option A
        event.preventDefault();
        this.selectOptionByIndex(0);
        break;

      case 'b': // B: Select option B
        event.preventDefault();
        this.selectOptionByIndex(1);
        break;

      case 'c': // C: Select option C
        event.preventDefault();
        this.selectOptionByIndex(2);
        break;

      case 'd': // D: Select option D
        event.preventDefault();
        this.selectOptionByIndex(3);
        break;

      case 'arrowright': // →: Next question
        if (this.showExplain && !this.finished) {
          event.preventDefault();
          this.nextQuestion();
        }
        break;

      case 'arrowleft': // ←: Previous question
        if (this.currentIndex > 0) {
          event.preventDefault();
          this.previousQuestion();
        }
        break;
    }
  }

  private selectOptionByIndex(index: number): void {
    if (this.showExplain) return; // Can't change after showing explanation

    const currentQuestion = this.questions[this.currentIndex];
    if (currentQuestion?.options && index < currentQuestion.options.length) {
      const selectedOption = currentQuestion.options[index];
      // Trigger the answered event
      this.onAnswered(selectedOption.isCorrect ?? false);
    }
  }

  // ============= AUDIO PLAYER METHODS =============

  getCurrentAudioUrl(): string {
    const currentQuestion = this.questions[this.currentIndex];
    return currentQuestion?.prompt?.referenceAudioUrl || '';
  }

  playAudio(): void {
    if (!this.audioElement) {
      console.warn('⚠️ Audio element not found');
      return;
    }

    const audio = this.audioElement.nativeElement;

    if (this.isAudioPlaying) {
      // CHỈ PAUSE, KHÔNG TRỪ LƯỢT
      audio.pause();
      this.isAudioPlaying = false;
    } else {
      // Kiểm tra giới hạn số lần nghe
      if (this.audioPlayCount >= this.maxPlays && this.maxPlays > 0) {
        alert(`Bạn đã nghe tối đa ${this.maxPlays} lần cho câu này`);
        return;
      }

      audio
        .play()
        .then(() => {
          this.isAudioPlaying = true;
          // ✅ FIX: KHÔNG TRỪ LƯỢT Ở ĐÂY - Chờ onAudioEnded()
        })
        .catch((error) => {
          console.error('❌ Audio play error:', error);
          alert('Không thể phát audio. Vui lòng kiểm tra kết nối.');
        });
    }
  }

  pauseAudio(): void {
    if (this.audioElement) {
      this.audioElement.nativeElement.pause();
      this.isAudioPlaying = false;
    }
  }

  onAudioPlay(): void {
    this.isAudioPlaying = true;
  }

  onAudioEnded(): void {
    this.isAudioPlaying = false;
    // ✅ FIX: CHỈ TRỪ LƯỢT KHI NGHE XONG
    this.audioPlayCount++;
    console.log(
      `✅ Nghe xong! Đã nghe: ${this.audioPlayCount}/${this.maxPlays}`
    );
  }

  onTimeUpdate(): void {
    if (this.audioElement) {
      const audio = this.audioElement.nativeElement;
      this.currentTime = audio.currentTime;
      this.duration = audio.duration || 0;
      this.audioProgress =
        this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  changePlaybackSpeed(): void {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(this.playbackSpeed);
    this.playbackSpeed = speeds[(currentIndex + 1) % speeds.length];

    if (this.audioElement) {
      this.audioElement.nativeElement.playbackRate = this.playbackSpeed;
    }
  }

  toggleVolume(): void {
    if (this.audioElement) {
      const audio = this.audioElement.nativeElement;
      this.isMuted = !this.isMuted;
      audio.muted = this.isMuted;
    }
  }

  private resetAudioState(): void {
    this.pauseAudio();
    this.isAudioPlaying = false;
    this.audioPlayCount = 0;
    this.currentTime = 0;
    this.duration = 0;
    this.audioProgress = 0;
  }

  // ============= PART DETECTION METHODS =============

  isPhotographPart(index: number): boolean {
    const questionType = this.questions[index]?.questionType?.toUpperCase();
    return (
      questionType === 'LISTENING_PART_1' ||
      this.partInfo?.partCode?.includes('Part 1') ||
      false
    );
  }

  getPartLabel(index: number): string {
    const questionType = this.questions[index]?.questionType?.toUpperCase();

    if (
      questionType?.includes('PART_1') ||
      this.partInfo?.partCode?.includes('Part 1')
    ) {
      return 'Part 1: Photographs';
    }
    if (
      questionType?.includes('PART_2') ||
      this.partInfo?.partCode?.includes('Part 2')
    ) {
      return 'Part 2: Question-Response';
    }
    if (
      questionType?.includes('PART_3') ||
      this.partInfo?.partCode?.includes('Part 3')
    ) {
      return 'Part 3: Conversations';
    }
    if (
      questionType?.includes('PART_4') ||
      this.partInfo?.partCode?.includes('Part 4')
    ) {
      return 'Part 4: Short Talks';
    }

    return this.partInfo?.partCode || 'Listening';
  }

  // ============= NAVIGATION METHODS (từ ReadingComponent) =============

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.restoreQuestionState();
      this.resetAudioState();
      console.log('⬅️ Previous question:', {
        currentIndex: this.currentIndex,
        questionId: this.questions[this.currentIndex]?.questionId,
        savedAnswer: this.getCurrentSavedAnswer(),
        preSelectedOptionId: this.getCurrentPreSelectedOptionId(),
      });
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.restoreQuestionState();
      this.resetAudioState();
      console.log('➡️ Next question:', {
        currentIndex: this.currentIndex,
        questionId: this.questions[this.currentIndex]?.questionId,
        savedAnswer: this.getCurrentSavedAnswer(),
        preSelectedOptionId: this.getCurrentPreSelectedOptionId(),
      });
    } else if (this.showExplain) {
      this.finished = true;
      this.saveSummaryToLocalStorage();
    }
  }

  // ✅ NEW: Tự động phát audio khi chuyển câu
  private autoPlayAudioOnQuestionChange(): void {
    // Đợi một chút để audio element được cập nhật
    setTimeout(() => {
      if (this.getCurrentAudioUrl() && this.audioPlayCount < this.maxPlays) {
        this.playAudio();
      }
    }, 300);
  }

  onTimeout(): void {
    // ✅ FIX: Hết giờ KHÔNG đánh sai, chỉ log để người dùng biết
    console.log('⏰ Time is up for question', this.currentIndex + 1);
    // Người dùng vẫn có thể chọn đáp án sau khi hết giờ
  }

  onAnswered(isCorrect: boolean): void {
    const currentQuestion = this.questions[this.currentIndex];

    if (!currentQuestion) {
      console.error('❌ onAnswered: No current question');
      return;
    }

    // Tính điểm
    if (isCorrect) {
      const score = currentQuestion.scoreWeight || 1;
      this.totalScore += score;
      this.correctCount++;
    }

    // ✅ Get selectedOptionId from localStorage
    const selectedOptionId = this.getSelectedOptionIdFromStorage(
      currentQuestion.questionId
    );

    console.log('📝 onAnswered:', {
      questionId: currentQuestion.questionId,
      isCorrect,
      selectedOptionId,
      beforeSave_savedAnswers: [...this.savedAnswers],
    });

    this.saveCurrentAnswer(isCorrect, selectedOptionId);

    console.log('📝 After save:', {
      savedAnswers: [...this.savedAnswers],
      preSelectedOptionId: this.getCurrentPreSelectedOptionId(),
    });

    // Hiển thị giải thích
    this.showExplain = true;

    // Emit event
    this.listeningAnswered.emit(isCorrect);
    this.answered.emit(isCorrect); // Legacy support
  }

  private getSelectedOptionIdFromStorage(questionId: number): number | null {
    try {
      const storageKey = 'Answer_Reading_' + this.getCurrentUserId();
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const store = JSON.parse(raw) as Array<{
        questionId: number;
        optionId: number;
      }>;
      const found = store.find((x) => x.questionId === questionId);
      return found?.optionId || null;
    } catch {
      return null;
    }
  }

  private getCurrentUserId(): string {
    // Try to get user ID from AuthService or use 'guest'
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || 'guest';
      }
    } catch {}
    return 'guest';
  }

  // ============= LOCALSTORAGE METHODS (từ ReadingComponent) =============

  private getStorageKey(): string {
    const partId = this.partInfo?.partId || 'unknown';
    return `listening_answers_part_${partId}`;
  }

  private saveCurrentAnswer(
    isCorrect: boolean,
    selectedOptionId: number | null
  ): void {
    const currentQuestion = this.questions[this.currentIndex];
    if (!currentQuestion || !selectedOptionId) {
      console.error('❌ Cannot save answer: missing question or optionId', {
        hasQuestion: !!currentQuestion,
        selectedOptionId,
      });
      return;
    }

    // Remove existing answer for this question from in-memory array
    this.savedAnswers = this.savedAnswers.filter(
      (a) => a.questionId !== currentQuestion.questionId
    );

    // Add new answer to in-memory array
    const answerRecord: ListeningSavedAnswer = {
      questionId: currentQuestion.questionId,
      selectedOptionId: selectedOptionId,
      isCorrect: isCorrect,
      timestamp: Date.now(),
    };

    this.savedAnswers.push(answerRecord);

    console.log('✅ Saved answer to in-memory state:', {
      answerRecord,
      totalSavedAnswers: this.savedAnswers.length,
      allAnswers: this.savedAnswers.map((a) => ({
        qId: a.questionId,
        optId: a.selectedOptionId,
        correct: a.isCorrect,
      })),
    });
  }

  private loadSavedAnswers(): void {
    const storageKey = this.getStorageKey();
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      this.savedAnswers = JSON.parse(saved);
      console.log('💾 Loaded saved answers:', this.savedAnswers);

      // ✅ FIX: Restore score from saved answers
      this.restoreProgressFromSavedAnswers();
    } else {
      this.savedAnswers = [];
    }
  }

  private restoreProgressFromSavedAnswers(): void {
    this.totalScore = 0;
    this.correctCount = 0;

    this.savedAnswers.forEach((answer) => {
      if (answer.isCorrect) {
        const question = this.questions.find(
          (q) => q.questionId === answer.questionId
        );
        if (question) {
          this.totalScore += question.scoreWeight || 1;
          this.correctCount++;
        }
      }
    });

    console.log(' Restored progress:', {
      totalScore: this.totalScore,
      correctCount: this.correctCount,
      savedCount: this.savedAnswers.length,
    });
  }

  getCurrentSavedAnswer(): ListeningSavedAnswer | null {
    const currentQuestion = this.questions[this.currentIndex];
    if (!currentQuestion) return null;

    return (
      this.savedAnswers.find(
        (a) => a.questionId === currentQuestion.questionId
      ) || null
    );
  }

  // ✅ FIX: Get pre-selected option ID for current question
  getCurrentPreSelectedOptionId(): number | null {
    const currentQuestion = this.questions[this.currentIndex];
    if (!currentQuestion) {
      console.log('getCurrentPreSelectedOptionId: No current question');
      return null;
    }

    const savedAnswer = this.savedAnswers.find(
      (a) => a.questionId === currentQuestion.questionId
    );

    const result = savedAnswer?.selectedOptionId || null;

    console.log('getCurrentPreSelectedOptionId:', {
      currentIndex: this.currentIndex,
      questionId: currentQuestion.questionId,
      savedAnswers: this.savedAnswers,
      foundSavedAnswer: savedAnswer,
      result,
    });

    return result;
  }

  private restoreQuestionState(): void {
    const savedAnswer = this.getCurrentSavedAnswer();

    console.log('restoreQuestionState:', {
      currentIndex: this.currentIndex,
      currentQuestionId: this.questions[this.currentIndex]?.questionId,
      savedAnswer,
      allSavedAnswers: this.savedAnswers,
    });

    if (savedAnswer) {
      // ✅ Hiển thị explanation khi có câu trả lời đã lưu
      this.showExplain = true;
    } else {
      // Câu mới -> reset
      this.showExplain = false;
    }
  }

  // ✅ REMOVE: Old method - replaced above

  private saveSummaryToLocalStorage(): void {
    const storageKey = `listening_summary_part_${
      this.partInfo?.partId || 'unknown'
    }`;

    const summary = {
      partId: this.partInfo?.partId,
      partCode: this.partInfo?.partCode,
      totalScore: this.totalScore,
      correctCount: this.correctCount,
      totalQuestions: this.questions.length,
      percentCorrect: this.percentCorrect,
      completedAt: new Date().toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify(summary));
  }

  // ============= COMPUTED PROPERTIES =============

  get percentCorrect(): number {
    const total = this.questions.length;
    if (total === 0) return 0;
    return Math.round((this.correctCount / total) * 100);
  }

  get feedbackText(): string {
    const p = this.percentCorrect;
    if (p < 30) return 'Bạn cần cố gắng nhiều hơn';
    if (p < 60) return 'Lần sau bạn chắc chắn sẽ làm tốt hơn';
    return 'Bạn hãy tiếp tục phát huy nhé';
  }

  get allSavedAnswers(): ListeningSavedAnswer[] {
    const storageKey = this.getStorageKey();
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  }

  // ============= RESET & NAVIGATION =============

  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.resetAudioState();

    // Clear saved data
    const storageKey = this.getStorageKey();
    const summaryKey = `listening_summary_part_${
      this.partInfo?.partId || 'unknown'
    }`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(summaryKey);
    this.savedAnswers = [];
  }

  goToExams(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }
}
